import BadReqError from '@/controllers/custom_error/bad_req_error';

export default function checkSupportMethod(supportMethod: string[], method?: string): void {
  if (supportMethod.indexOf(method!) === -1) {
    throw new BadReqError('지원하지 않는 method');
  }
}
