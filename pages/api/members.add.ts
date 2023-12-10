import { NextApiRequest, NextApiResponse } from 'next';
import MemberCtrl from '@/controllers/member.ctrl';
import handleError from '@/controllers/handle_error';
import checkSupportMethod from '@/controllers/check_support_method';
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const supportMethod = ['POST'];
  try {
    checkSupportMethod(supportMethod, method);
    await MemberCtrl.add(req, res);
  } catch (err) {
    console.error(err);
    // 에러 처리
    handleError(err, res);
  }
}
