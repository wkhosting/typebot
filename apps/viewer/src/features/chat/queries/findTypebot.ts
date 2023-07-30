import prisma from '@/lib/prisma'

type Props = {
  id: string
  userId?: string
}

export const findTypebot = ({ id, userId }: Props) =>
  prisma.typebot.findFirst({
    where: { id, workspace: { members: { some: { userId } } } },
    select: {
      id: true,
      groups: true,
      edges: true,
      settings: true,
      theme: true,
      variables: true,
      isArchived: true,
    },
  })
