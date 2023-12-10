// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { NextApiRequest, NextApiResponse } from 'next';

import handleError from '@/controllers/handle_error';
import checkSupportMethod from '@/controllers/check_support_method';
import MemberCtrl from '@/controllers/member.ctrl';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  const supportMethod = ['GET'];
  try {
    checkSupportMethod(supportMethod, method);
    await MemberCtrl.findByScreenName(req, res);
  } catch (err) {
    console.error(err);
    handleError(err, res);
  }
}
