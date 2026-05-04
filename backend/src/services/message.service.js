const prisma = require("../prisma/client");

async function send({ senderId, receiverId, message }) {
  return prisma.message.create({ data: { senderId, receiverId, message } });
}

async function thread(userAId, userBId) {
  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: userAId, receiverId: userBId },
        { senderId: userBId, receiverId: userAId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

module.exports = { send, thread };
