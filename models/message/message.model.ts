import { firestore } from 'firebase-admin';
import CustomServerError from '@/controllers/custom_error/custom_server_error';
import FirebaseAdmin from '../auth/firebase_admin';
import { InMessageServer } from './in_message';
import FieldValue = firestore.FieldValue;
import { InAuthUser } from '../in_auth_user';

const MEMBER_COL = 'members';
const MSG_COL = 'messages';

const { Firestore } = FirebaseAdmin.getInstance();

async function post({
  uid,
  message,
  author,
}: {
  uid: string;
  message: string;
  author?: {
    displayName: string;
    photoURL?: string;
  };
}) {
  const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
  await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
    const memberDoc = await transaction.get(memberRef);
    // 존재하지 않는 사용자
    if (!memberDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자' });
    }
    let messageCount = 1;
    const memberInfo = memberDoc.data() as InAuthUser & { messageCount?: number };
    if (memberInfo.messageCount) {
      messageCount = memberInfo.messageCount;
    }
    // doc(): 파라미터를 넣지 않으면 새로운 문서 생성
    const newMessageRef = memberRef.collection(MSG_COL).doc();
    const newMessageBody: {
      message: string;
      createAt: firestore.FieldValue;
      author?: {
        displayName: string;
        photoURL?: string;
      };
      messageNo: number;
    } = {
      message,
      messageNo: messageCount,
      createAt: FieldValue.serverTimestamp(),
    };
    if (!author) {
      // eslint-disable-next-line no-param-reassign
      author = newMessageBody.author;
    }
    await transaction.set(newMessageRef, newMessageBody);
    await transaction.update(memberRef, { messageCount: messageCount + 1 });
  });
}

async function updateMessage({ uid, messageId, deny }: { uid: string; messageId: string; deny: boolean }) {
  const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
  const messageRef = Firestore.collection(MEMBER_COL).doc(uid).collection(MSG_COL).doc(messageId);
  const result = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
    const memberDoc = await transaction.get(memberRef);
    const messageDoc = await transaction.get(messageRef);
    if (!memberDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자' });
    }
    if (!messageDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 문서' });
    }
    await transaction.update(messageRef, { deny });
    const messageData = messageDoc.data() as InMessageServer;
    return {
      ...messageData,
      id: messageId,
      deny,
      createAt: messageData.createAt.toDate().toISOString(),
      replyAt: messageData.replyAt ? messageData.replyAt.toDate().toISOString() : undefined,
    };
  });
  return result;
}

async function list({ uid }: { uid: string }) {
  const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
  const listData = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
    const memberDoc = await transaction.get(memberRef);
    if (!memberDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자' });
    }
    const messageCol = memberRef.collection(MSG_COL).orderBy('createAt', 'desc');
    const messageColDoc = await transaction.get(messageCol);
    const data = messageColDoc.docs.map((mv: any) => {
      const docData = mv.data() as Omit<InMessageServer, 'id'>;
      const returnData = {
        ...docData,
        id: mv.id,
        createAt: docData.createAt.toDate().toISOString(),
        replyAt: docData.replyAt ? docData.replyAt.toDate().toISOString() : undefined,
      } as unknown as InMessageServer;
      return returnData;
    });
    return data;
  });
  return listData;
}

async function listWithPage({ uid, page = 1, size = 10 }: { uid: string; page?: number; size?: number }) {
  const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
  const listData = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
    const memberDoc = await transaction.get(memberRef);
    if (!memberDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자' });
    }
    const memberInfo = memberDoc.data() as InAuthUser & { messageCount?: number };
    const { messageCount = 0 } = memberInfo;
    const totalElements = messageCount !== 0 ? messageCount - 1 : 0;
    const remains = totalElements % size;
    const totalPages = (totalElements - remains) / size + (remains > 0 ? 1 : 0);
    const startAt = totalElements - (page - 1) * size;
    if (startAt < 0) {
      return {
        totalElements,
        totalPages: 0,
        page,
        size,
        content: [],
      };
    }
    const messageCol = memberRef.collection(MSG_COL).orderBy('messageNo', 'desc').startAt(startAt).limit(size);
    const messageColDoc = await transaction.get(messageCol);
    const data = messageColDoc.docs.map((mv: any) => {
      const docData = mv.data() as Omit<InMessageServer, 'id'>;
      const isDeny = docData.deny !== undefined && docData.deny === true;
      const returnData = {
        ...docData,
        message: isDeny ? '비공개 처리된 메시지' : docData.message,
        id: mv.id,
        createAt: docData.createAt.toDate().toISOString(),
        replyAt: docData.replyAt ? docData.replyAt.toDate().toISOString() : undefined,
      } as unknown as InMessageServer;
      return returnData;
    });
    return {
      totalElements,
      totalPages,
      page,
      size,
      content: data,
    };
  });
  return listData;
}

async function postReply({ uid, messageId, reply }: { uid: string; messageId: string; reply: string }) {
  const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
  const messageRef = Firestore.collection(MEMBER_COL).doc(uid).collection(MSG_COL).doc(messageId);
  await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
    const memberDoc = await transaction.get(memberRef);
    const messageDoc = await transaction.get(messageRef);
    if (!memberDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자' });
    }
    if (!messageDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 메시지' });
    }
    const messageData = messageDoc.data() as InMessageServer;
    if (messageData.reply) {
      throw new CustomServerError({ statusCode: 400, message: '이미 등록된 댓글' });
    }
    await transaction.update(messageRef, { reply, replyAt: firestore.FieldValue.serverTimestamp() });
  });
}

async function get({ uid, messageId }: { uid: string; messageId: string }) {
  const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
  const messageRef = Firestore.collection(MEMBER_COL).doc(uid).collection(MSG_COL).doc(messageId);
  const data = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
    const memberDoc = await transaction.get(memberRef);
    const messageDoc = await transaction.get(messageRef);
    if (!memberDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자' });
    }
    if (!messageDoc.exists) {
      throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 메시지' });
    }
    const messageData = messageDoc.data() as InMessageServer;
    const isDeny = messageData.deny !== undefined && messageData.deny === true;
    return {
      ...messageData,
      message: isDeny ? '비공개 처리된 메시지' : messageData.message,
      id: messageId,
      createAt: messageData.createAt.toDate().toISOString(),
      replyAt: messageData.replyAt ? messageData.replyAt.toDate().toISOString() : undefined,
    };
  });
  return data;
}

// async function updateMessage({ uid, messageId, deny }: { uid: string; messageId: string; deny: boolean }) {
//   const memberRef = Firestore.collection(MEMBER_COL).doc(uid);
//   const messageRef = Firestore.collection(MEMBER_COL).doc(uid).collection(MSG_COL).doc(messageId);
//   const result = await Firestore.runTransaction(async (transaction: any) => {
//     const memberDoc = await transaction.get(memberRef);
//     const messageDoc = await transaction.get(messageRef);
//     if (memberDoc.exists === false) {
//       throw new CustomServerError({ statusCode: 400, message: '존재하지않는 사용자' });
//     }
//     if (messageDoc.exists === false) {
//       throw new CustomServerError({ statusCode: 400, message: '존재하지않는 문서' });
//     }
//     await transaction.update(messageRef, { deny });
//     const messageData = messageDoc.data() as InMessageServer;
//     return {
//       ...messageData,
//       id: messageId,
//       deny,
//       createAt: messageData.createAt.toDate().toISOString(),
//       updateAt: messageData.updateAt ? messageData.updateAt.toDate().toISOString() : undefined,
//     };
//   });
//   return result;
// }

// async function listByUid({ uid, page = 1, size = 10 }: { uid: string; page?: number; size?: number }) {
//   const memberRef = FirebaseAdmin.getInstance().Firestore.collection(MEMBER_COL).doc(uid);
//   const result = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
//     const memberDoc = await transaction.get(memberRef);
//     // 해당 사용자가 존재하지 않는다.
//     if (memberDoc.exists === false) {
//       throw new CustomServerError({ statusCode: 404, message: '존재하지않는 사용자' });
//     }
//     // 전체 갯수를 조회
//     const { messageCount = 0 } = memberDoc.data() as { messageCount?: number };
//     const totalElements = messageCount !== 0 ? messageCount - 1 : 0;
//     const remains = totalElements % size;
//     const totalPages = (totalElements - remains) / size + (remains > 0 ? 1 : 0);
//     // 전체 갯수에서 page 숫자만큼 숫자를 미뤄서 검색한다.
//     const startAt = totalElements - (page - 1) * size;
//     if (startAt < 0) {
//       return {
//         totalElements,
//         totalPages: 0,
//         page,
//         size,
//         content: [],
//       };
//     }
//     const colRef = FirebaseAdmin.getInstance()
//       .Firestore.collection(MEMBER_COL)
//       .doc(uid)
//       .collection(MSG_COL)
//       .orderBy('messageNo', 'desc')
//       .startAt(startAt)
//       .limit(size);
//     const colDocs = await transaction.get(colRef);
//     const data = colDocs.docs.map((mv: any) => {
//       const docData = mv.data() as Omit<InMessageServer, 'id'>;
//       const isDeny = docData.deny !== undefined && docData.deny === true;
//       const returnData = {
//         ...docData,
//         id: mv.id,
//         message: isDeny ? '비공개 처리된 메시지 입니다.' : docData.message,
//         createAt: docData.createAt.toDate().toISOString(),
//         updateAt: docData.updateAt ? docData.updateAt.toDate().toISOString() : undefined,
//       } as InMessage;
//       return returnData;
//     });
//     return {
//       totalElements,
//       totalPages,
//       page,
//       size,
//       content: data,
//     };
//   });
//   return result;
// }

// async function listByScreenName({
//   screenName,
//   page = 1,
//   size = 10,
// }: {
//   screenName: string;
//   page?: number;
//   size?: number;
// }) {
//   const memberRef = FirebaseAdmin.getInstance().Firestore.collection(SCR_NAME_COL).doc(screenName);

//   const doc = await memberRef.get();

//   if (doc.exists === false) {
//     return {
//       totalElements: 0,
//       totalPages: 0,
//       page,
//       size,
//       content: [],
//     };
//   }
//   const mappingData = doc.data() as { id: string };
//   const list = listByUid({ uid: mappingData.id, page, size });
//   return list;
// }

// async function get({ uid, messageId }: { uid: string; messageId: string }) {
//   const messageRef = FirebaseAdmin.getInstance()
//     .Firestore.collection(MEMBER_COL)
//     .doc(uid)
//     .collection(MSG_COL)
//     .doc(messageId);
//   const messageDoc = await messageRef.get();
//   if (messageDoc.exists === false) {
//     throw new CustomServerError({ statusCode: 404, message: '메시지를 찾을 수 없습니다' });
//   }
//   const data = messageDoc.data() as InMessageServer;
//   const isDeny = data.deny !== undefined && data.deny === true;
//   return {
//     ...data,
//     id: messageId,
//     message: isDeny ? '비공개 처리된 메시지 입니다.' : data.message,
//     createAt: data.createAt.toDate().toISOString(),
//     updateAt: data.updateAt ? data.updateAt.toDate().toISOString() : undefined,
//   };
// }

// async function postReplay({ uid, messageId, reply }: { uid: string; messageId: string; reply: string }) {
//   const memberRef = FirebaseAdmin.getInstance().Firestore.collection(MEMBER_COL).doc(uid);
//   const messageRef = FirebaseAdmin.getInstance()
//     .Firestore.collection(MEMBER_COL)
//     .doc(uid)
//     .collection(MSG_COL)
//     .doc(messageId);
//   await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction: any) => {
//     const memberDoc = await transaction.get(memberRef);
//     const messageDoc = await transaction.get(messageRef);
//     // 존재하지 않는 사용자
//     if (memberDoc.exists === false) {
//       throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 사용자에게 답변을 보내고 있네요 ☠️' });
//     }
//     if (messageDoc.exists === false) {
//       throw new CustomServerError({ statusCode: 400, message: '존재하지 않는 메시지에 답변을 보내고 있네요 ☠️' });
//     }
//     const messageData = messageDoc.data() as InMessageServer;
//     // 이미 댓글을 작성한 경우
//     if (messageData.reply !== undefined) {
//       throw new CustomServerError({ statusCode: 400, message: '이미 답변을 등록했습니다 ☠️' });
//     }
//     await transaction.update(messageRef, { reply, updateAt: FieldValue.serverTimestamp() });
//   });
// }

const MessageModel = {
  post,
  updateMessage,
  list,
  listWithPage,
  get,
  postReply,
  // get,
  // postReplay,
  // listByUid,
  // listByScreenName,
};

export default MessageModel;
