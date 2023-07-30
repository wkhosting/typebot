import { ExecuteIntegrationResponse } from '@/features/chat/types'
import prisma from '@/lib/prisma'
import { Block, BubbleBlockType, SessionState } from '@typebot.io/schemas'
import {
  ChatCompletionOpenAIOptions,
  OpenAICredentials,
  chatCompletionMessageRoles,
} from '@typebot.io/schemas/features/blocks/integrations/openai'
import { byId, isEmpty } from '@typebot.io/lib'
import { decrypt, isCredentialsV2 } from '@typebot.io/lib/api/encryption'
import { updateVariables } from '@/features/variables/updateVariables'
import { parseVariableNumber } from '@/features/variables/parseVariableNumber'
import { resumeChatCompletion } from './resumeChatCompletion'
import { parseChatCompletionMessages } from './parseChatCompletionMessages'
import { executeChatCompletionOpenAIRequest } from './executeChatCompletionOpenAIRequest'
import { isPlaneteScale } from '@/helpers/api/isPlanetScale'

export const createChatCompletionOpenAI = async (
  state: SessionState,
  {
    outgoingEdgeId,
    options,
    blockId,
  }: {
    outgoingEdgeId?: string
    options: ChatCompletionOpenAIOptions
    blockId: string
  }
): Promise<ExecuteIntegrationResponse> => {
  let newSessionState = state
  const noCredentialsError = {
    status: 'error',
    description: 'Make sure to select an OpenAI account',
  }
  if (!options.credentialsId) {
    return {
      outgoingEdgeId,
      logs: [noCredentialsError],
    }
  }
  const credentials = await prisma.credentials.findUnique({
    where: {
      id: options.credentialsId,
    },
  })
  if (!credentials) {
    console.error('Could not find credentials in database')
    return { outgoingEdgeId, logs: [noCredentialsError] }
  }
  const { apiKey } = (await decrypt(
    credentials.data,
    credentials.iv
  )) as OpenAICredentials['data']
  const { variablesTransformedToList, messages } = parseChatCompletionMessages(
    newSessionState.typebot.variables
  )(options.messages)
  if (variablesTransformedToList.length > 0)
    newSessionState = updateVariables(state)(variablesTransformedToList)

  const temperature = parseVariableNumber(newSessionState.typebot.variables)(
    options.advancedSettings?.temperature
  )

  if (
    isPlaneteScale() &&
    isCredentialsV2(credentials) &&
    newSessionState.isStreamEnabled
  ) {
    const assistantMessageVariableName = state.typebot.variables.find(
      (variable) =>
        options.responseMapping.find(
          (m) => m.valueToExtract === 'Message content'
        )?.variableId === variable.id
    )?.name

    return {
      clientSideActions: [
        {
          streamOpenAiChatCompletion: {
            messages: messages as {
              content?: string
              role: (typeof chatCompletionMessageRoles)[number]
            }[],
            displayStream: isNextBubbleMessageWithAssistantMessage(
              state.typebot
            )(blockId, assistantMessageVariableName),
          },
        },
      ],
      outgoingEdgeId,
      newSessionState,
    }
  }

  const { response, logs } = await executeChatCompletionOpenAIRequest({
    apiKey,
    messages,
    model: options.model,
    temperature,
  })
  if (!response)
    return {
      outgoingEdgeId,
      logs,
    }
  const messageContent = response.choices.at(0)?.message?.content
  const totalTokens = response.usage?.total_tokens
  if (isEmpty(messageContent)) {
    console.error('OpenAI block returned empty message', response)
    return { outgoingEdgeId, newSessionState }
  }
  return resumeChatCompletion(newSessionState, {
    options,
    outgoingEdgeId,
    logs,
  })(messageContent, totalTokens)
}

const isNextBubbleMessageWithAssistantMessage =
  (typebot: SessionState['typebot']) =>
  (blockId: string, assistantVariableName?: string): boolean => {
    if (!assistantVariableName) return false
    const nextBlock = getNextBlock(typebot)(blockId)
    if (!nextBlock) return false
    return (
      nextBlock.type === BubbleBlockType.TEXT &&
      nextBlock.content.richText?.length > 0 &&
      nextBlock.content.richText?.at(0)?.children.at(0).text ===
        `{{${assistantVariableName}}}`
    )
  }

const getNextBlock =
  (typebot: SessionState['typebot']) =>
  (blockId: string): Block | undefined => {
    const group = typebot.groups.find((group) =>
      group.blocks.find(byId(blockId))
    )
    if (!group) return
    const blockIndex = group.blocks.findIndex(byId(blockId))
    const nextBlockInGroup = group.blocks.at(blockIndex + 1)
    if (nextBlockInGroup) return nextBlockInGroup
    const outgoingEdgeId = group.blocks.at(blockIndex)?.outgoingEdgeId
    if (!outgoingEdgeId) return
    const outgoingEdge = typebot.edges.find(byId(outgoingEdgeId))
    if (!outgoingEdge) return
    const connectedGroup = typebot.groups.find(byId(outgoingEdge?.to.groupId))
    if (!connectedGroup) return
    return outgoingEdge.to.blockId
      ? connectedGroup.blocks.find(
          (block) => block.id === outgoingEdge.to.blockId
        )
      : connectedGroup?.blocks.at(0)
  }
