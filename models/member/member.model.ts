// import OKError from '@/controllers/custom_error/ok_error';
// import { get8RandomText } from '@/utils/random_text';
// import FirebaseAdmin from '../firebase_admin';
// import { InMemberInfo } from './in_member_info';
import { InAuthUser } from '@/models/auth/in_auth_user';
import FirebaseAdmin from '../auth/firebase_admin';

const MEMBER_COL = 'members';
const SCR_NAME_COL = 'screen_names';

type AddResult = { result: true; id: string } | { result: false; message: string };

// eslint-disable-next-line no-empty-pattern
// Promise<{result: true, id: string} | {result: false, message: string}> : Type 'Promise<{ result: true; id: string; }> | { result: false; message: string; }' is not a valid async function return type in ES5/ES3 because it does not refer to a Promise-compatible constructor value
async function add({ uid, email, displayName, photoURL }: InAuthUser): Promise<AddResult> {
  try {
    const screenName = (email as string).replace('@gmail.com', '');
    const addResult = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction) => {
      const memberRef = FirebaseAdmin.getInstance().Firestore.collection(MEMBER_COL).doc(uid);
      const screenNameRef = FirebaseAdmin.getInstance().Firestore.collection(SCR_NAME_COL).doc(screenName);
      const memberDoc = await transaction.get(memberRef);

      if (memberDoc.exists) {
        // 이미 추가된 상태
        return false;
      }

      const addData = {
        uid,
        email,
        displayName: displayName ?? '',
        photoURL: photoURL ?? '',
      };
      await transaction.set(memberRef, addData);
      await transaction.set(screenNameRef, addData);

      return true;
    });

    if (!addResult) {
      return { result: true, id: uid };
    }
    return { result: true, id: uid };
  } catch (err) {
    console.error(err);
    return { result: false, message: 'Server Error' };
  }
}

async function findByScreenName(screenName: string): Promise<InAuthUser | null> {
  const memberRef = FirebaseAdmin.getInstance().Firestore.collection(SCR_NAME_COL).doc(screenName);
  const memberDoc = await memberRef.get();

  if (!memberDoc.exists) {
    return null;
  }

  const data = memberDoc.data() as InAuthUser;

  return data;
}

const MemberModel = {
  add,
  findByScreenName,
};

export default MemberModel;

// async function memberAdd(args: InMemberInfo): Promise<InMemberInfo | null> {
//   const altScreenName = `${args.screenName}${get8RandomText()}`;
//   const screenNameDocRef = FirebaseAdmin.getInstance().Firestore.collection(SCR_NAME_COL).doc(args.screenName);
//   const altScreenNameDocRef = FirebaseAdmin.getInstance().Firestore.collection(SCR_NAME_COL).doc(altScreenName);
//   const memberRef = FirebaseAdmin.getInstance().Firestore.collection(MEMBER_COL).doc(args.uid);

//   const addMemberInfo = await FirebaseAdmin.getInstance().Firestore.runTransaction(async (transaction) => {
//     const memberDoc = await transaction.get(memberRef);
//     const screenNameDoc = await transaction.get(screenNameDocRef);
//     const altScreenNameDoc = await transaction.get(altScreenNameDocRef);
//     const usedScreenName = screenNameDoc.exists === true;
//     // 이미 등록된 사용자 id
//     if (memberDoc.exists === true) {
//       throw new OKError(`/${args.screenName}`);
//     }
//     // 사용중이지 않은 screenName
//     if (usedScreenName === false) {
//       transaction.create(screenNameDocRef, { id: args.uid });
//     }
//     // 임의로 만든 screenName으로 저장
//     if (usedScreenName && altScreenNameDoc.exists === false) {
//       transaction.create(altScreenNameDocRef, { id: args.uid });
//     }

//     const createData: InMemberInfo & { id: string } = {
//       ...args,
//       screenName: usedScreenName ? altScreenName : args.screenName,
//       email: args.email ?? '',
//       id: args.uid,
//     };

//     transaction.create(memberRef, createData);
//     return createData;
//   });

//   return addMemberInfo;
// }

// async function memberFind(id: string): Promise<InMemberInfo | null> {
//   const memberRef = FirebaseAdmin.getInstance().Firestore.collection(MEMBER_COL).doc(id);

//   const doc = await memberRef.get();

//   if (doc.exists === false) {
//     return null;
//   }
//   return doc.data() as InMemberInfo;
// }

// async function memberFindByScreenName(screenName: string): Promise<InMemberInfo | null> {
//   const memberRef = FirebaseAdmin.getInstance().Firestore.collection(SCR_NAME_COL).doc(screenName);

//   const doc = await memberRef.get();

//   if (doc.exists === false) {
//     return null;
//   }
//   const mappingData = doc.data() as { id: string };
//   const memberInfo = await memberFind(mappingData.id);
//   return memberInfo;
// }

// export { memberAdd, memberFind, memberFindByScreenName };
