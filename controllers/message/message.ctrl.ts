import { NextApiRequest, NextApiResponse } from 'next';
import MessageModel from '@/models/message/message.model';
import BadReqError from '../custom_error/bad_req_error';
import CustomServerError from '../custom_error/custom_server_error';
import FirebaseAdmin from '../../models/auth/firebase_admin';

async function post(req: NextApiRequest, res: NextApiResponse) {
  const { uid, message, author } = req.body;

  if (!uid) {
    throw new BadReqError('uid 누락');
  }

  if (!message) {
    throw new BadReqError('message 누락');
  }

  await MessageModel.post({ uid, message, author });
  return res.status(201).end();
}

async function list(req: NextApiRequest, res: NextApiResponse) {
  const { uid, page, size } = req.query;

  if (!uid) {
    throw new BadReqError('uid 누락');
  }

  const convertPage = !page ? '1' : page;
  const convertSize = !size ? '10' : size;
  const uidToStr = Array.isArray(uid) ? uid[0] : uid;
  const pageToStr = Array.isArray(convertPage) ? convertPage[0] : convertPage;
  const sizeToStr = Array.isArray(convertSize) ? convertSize[0] : convertSize;
  const listRes = await MessageModel.listWithPage({
    uid: uidToStr,
    page: parseInt(pageToStr, 10),
    size: parseInt(sizeToStr, 10),
  });
  return res.status(200).json(listRes);
}

async function postReply(req: NextApiRequest, res: NextApiResponse) {
  const { uid, messageId, reply } = req.body;

  if (!uid) {
    throw new BadReqError('uid 누락');
  }
  if (!messageId) {
    throw new BadReqError('messageId 누락');
  }
  if (!reply) {
    throw new BadReqError('reply 누락');
  }

  await MessageModel.postReply({ uid, messageId, reply });
  return res.status(201).end();
}

async function updateMessage(req: NextApiRequest, res: NextApiResponse) {
  const token = req.headers.authorization;
  const { uid, messageId, deny } = req.body;

  if (!token) {
    throw new CustomServerError({ statusCode: 401, message: '권한이 없습니다.' });
  }
  let tokenUid: null | string = null;
  try {
    const decode = await FirebaseAdmin.getInstance().Auth.verifyIdToken(token);
    tokenUid = decode.uid;
  } catch (err) {
    throw new BadReqError('token에 문제가 있습니다.');
  }
  if (!uid) {
    throw new BadReqError('uid 누락');
  }
  if (uid !== tokenUid) {
    throw new CustomServerError({ statusCode: 401, message: '수정 권한이 없습니다.' });
  }
  if (!messageId) {
    throw new BadReqError('messageId 누락');
  }
  if (deny === undefined) {
    throw new BadReqError('reply 누락');
  }

  const result = await MessageModel.updateMessage({ uid, messageId, deny });
  return res.status(200).json(result);
}

async function get(req: NextApiRequest, res: NextApiResponse) {
  const { uid, messageId } = req.query;

  if (!uid) {
    throw new BadReqError('uid 누락');
  }
  if (!messageId) {
    throw new BadReqError('messageId 누락');
  }

  const uidToStr = Array.isArray(uid) ? uid[0] : uid;
  const messageIdToStr = Array.isArray(messageId) ? messageId[0] : messageId;
  const data = await MessageModel.get({ uid: uidToStr, messageId: messageIdToStr });
  return res.status(200).json(data);
}

// async function updateMessage(req: NextApiRequest, res: NextApiResponse) {
//   const token = req.headers.authorization;
//   if (token === undefined) {
//     throw new CustomServerError({ statusCode: 401, message: '권한이 없습니다' });
//   }
//   const tokenUid = await verifyFirebaseIdToken(token);
//   const validateResp = validateParamWithData<DenyMessageReq>(
//     {
//       body: req.body,
//     },
//     JSCDenyMessageReq,
//   );
//   if (validateResp.result === false) {
//     throw new BadReqError(validateResp.errorMessage);
//   }
//   const { uid, messageId, deny } = validateResp.data.body;
//   if (uid !== tokenUid) {
//     throw new CustomServerError({ statusCode: 401, message: '수정 권한이 없습니다' });
//   }
//   const result = await MessageModel.updateMessage({ uid, messageId, deny });
//   return res.status(200).json(result);
// }

// async function postReplay(req: NextApiRequest, res: NextApiResponse) {
//   const token = req.headers.authorization;
//   if (token === undefined) {
//     throw new CustomServerError({ statusCode: 401, message: '권한이 없습니다' });
//   }
//   const tokenUid = await verifyFirebaseIdToken(token);
//   const validateResp = validateParamWithData<PostReplyMessageReq>(
//     {
//       query: req.query,
//       body: req.body,
//     },
//     JSCPostReplyMessageReq,
//   );
//   if (validateResp.result === false) {
//     throw new BadReqError(validateResp.errorMessage);
//   }

//   const { uid, messageId } = validateResp.data.query;
//   if (uid !== tokenUid) {
//     throw new CustomServerError({ statusCode: 401, message: '수정 권한이 없습니다' });
//   }
//   const { reply } = validateResp.data.body;
//   await MessageModel.postReplay({ uid, messageId, reply });
//   return res.status(200).end();
// }

// async function get(req: NextApiRequest, res: NextApiResponse) {
//   const validateResp = validateParamWithData<{
//     query: {
//       uid: string;
//       messageId: string;
//     };
//   }>(
//     {
//       query: req.query,
//     },
//     JSCGetMessageReq,
//   );
//   if (validateResp.result === false) {
//     throw new BadReqError(validateResp.errorMessage);
//   }
//   const info = await MessageModel.get({ ...validateResp.data.query });
//   return res.status(200).json(info);
// }

// async function list(req: NextApiRequest, res: NextApiResponse) {
//   const validateResp = validateParamWithData<ListMessageReq>(
//     {
//       query: req.query,
//     },
//     JSCListMessageReq,
//   );
//   if (validateResp.result === false) {
//     throw new BadReqError(validateResp.errorMessage);
//   }
//   const { screenName, uid, page, size } = validateResp.data.query;
//   if (screenName !== undefined) {
//     const listResp = await MessageModel.listByScreenName({ screenName, page, size });
//     return res.status(200).json(listResp);
//   }
//   if (uid !== undefined) {
//     const listResp = await MessageModel.listByUid({ uid, page, size });
//     return res.status(200).json(listResp);
//   }
// }

const MessageCtrl = {
  post,
  updateMessage,
  list,
  get,
  postReply,
  // list,
  // get,
  // postReplay,
};

export default MessageCtrl;
