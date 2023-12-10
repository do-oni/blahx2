import { firestore } from 'firebase-admin';

export interface InMessageBase {
  id: string;
  /** 사용자가 남긴 질문 */
  message: string;
  /** 댓글 */
  reply?: string;
  /** 메시지를 작성한 사람의 정보 */
  author?: {
    displayName: string;
    photoURL?: string;
  };
  /** 비공개 처리 여부 */
  deny: boolean;
}

export interface InMessage extends InMessageBase {
  createAt: string;
  replyAt?: string;
}

export interface InMessageServer extends InMessageBase {
  createAt: firestore.Timestamp;
  replyAt?: firestore.Timestamp;
}

export interface InMessageList {
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  content: InMessage[];
}
