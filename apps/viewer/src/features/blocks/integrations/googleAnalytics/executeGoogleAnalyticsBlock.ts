import { ExecuteIntegrationResponse } from '@/features/chat/types'
import { deepParseVariables } from '@/features/variables/deepParseVariable'
import { GoogleAnalyticsBlock, SessionState } from '@typebot.io/schemas'

export const executeGoogleAnalyticsBlock = (
  { typebot: { variables }, result }: SessionState,
  block: GoogleAnalyticsBlock
): ExecuteIntegrationResponse => {
  if (!result) return { outgoingEdgeId: block.outgoingEdgeId }
  const googleAnalytics = deepParseVariables(variables, {
    guessCorrectTypes: true,
    removeEmptyStrings: true,
  })(block.options)
  return {
    outgoingEdgeId: block.outgoingEdgeId,
    clientSideActions: [
      {
        googleAnalytics,
      },
    ],
  }
}
