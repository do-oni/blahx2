import { NextPage } from 'next';
import {
  Avatar,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Switch,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react';
import { TriangleDownIcon } from '@chakra-ui/icons';
import { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';
import ResizeTextarea from 'react-textarea-autosize';
import Head from 'next/head';
import getConfig from 'next/config';
import { ServiceLayout } from '@/components/containers/service_layout';
import { useAuth } from '@/contexts/auth_user.context';
import MessageItem from '@/components/message_item';
import { InAuthUser } from '@/models/in_auth_user';
import { InMessage } from '@/models/message/in_message';

/**
 * 각 사용자의 home view
 * 프로필 이미지, 닉네임, id가 출력
 * 질문을 작성할 수 있는 text area
 *
 * 기존에 대답한 내용이 아래쪽에 보여짐
 * 각 질문에서 답변 보기를 클릭하면 상세 화면으로 진입
 */

interface Props {
  userInfo: InAuthUser | null;
  screenName: string;
}

async function postMessage({
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
}): Promise<{ result: true } | { result: false; message: string }> {
  if (message.length <= 0) {
    return {
      result: false,
      message: '메시지를 입력해주세요',
    };
  }

  try {
    await fetch('/api/messages.add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        message,
        author,
      }),
    });
    return {
      result: true,
    };
  } catch (err) {
    console.error(err);
    return {
      result: false,
      message: '메시지 등록 실패',
    };
  }
}

const UserHomePage: NextPage<Props> = function ({ userInfo, screenName }) {
  const { publicRuntimeConfig } = getConfig();
  const toast = useToast();
  const { authUser } = useAuth();
  const [message, setMessage] = useState('');
  const [messageListFetchTrigger, setMessageListFetchTrigger] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [messageList, setMessageList] = useState<InMessage[]>([]);
  const [isAnonymous, setAnonymous] = useState(true);

  async function fetchMessageInfo({ uid, messageId }: { uid: string; messageId: string }) {
    try {
      const res = await fetch(`/api/messages.info?uid=${uid}&messageId=${messageId}`);
      if (res.status === 200) {
        const data: InMessage = await res.json();
        setMessageList((prev) => {
          const findIndex = prev.findIndex((fv) => fv.id === data.id);
          if (findIndex >= 0) {
            const updateArr = [...prev];
            updateArr[findIndex] = data;
            return updateArr;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
    }
  }
  const messageListQueryKey = ['messageList', userInfo?.uid, page, messageListFetchTrigger];
  useQuery(
    messageListQueryKey,
    async () =>
      // eslint-disable-next-line no-return-await
      await axios.get<{
        content: InMessage[];
        page: number;
        size: number;
        totalElements: number;
        totalPages: number;
      }>(`/api/messages.list?uid=${userInfo?.uid}&page=${page}&size=10`),
    {
      keepPreviousData: true, // 기존 데이터 유지
      refetchOnWindowFocus: false, // window focus 할 때 refetch 하지 않음
      onSuccess: (data) => {
        setTotalPages(data.data.totalPages);
        if (page === 1) {
          setMessageList([...data.data.content]);
        } else {
          setMessageList((prev) => [...prev, ...data.data.content]);
        }
      },
    },
  );

  if (!userInfo) {
    return <p>사용자를 찾을 수 없습니다.</p>;
  }
  const mainUrl = `https://${publicRuntimeConfig.mainDomain}/${userInfo.screenName}`;
  const anonymousUrl = 'https://bit.ly/broken-link';
  const isOwner = authUser && authUser.uid === userInfo.uid;

  return (
    <>
      <Head>
        <meta property="og:url" content={mainUrl} />
        <meta property="og:image" content={`https://${publicRuntimeConfig.mainDomain}/main.jpg`} />
        <meta property="og:site_name" content="blahX2" />
        <meta property="og:title" content={`${userInfo.displayName} 님에게 질문하기`} />
        <meta property="og:description" content={`${userInfo.displayName}님과 익명으로 대화를 나눠보세요`} />
        <meta name="twitter:title" content={`${userInfo.displayName} 님에게 질문하기`} />
        <meta name="twitter:description" content={`${userInfo.displayName}님과 익명으로 대화를 나눠보세요`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`https://${publicRuntimeConfig.mainDomain}/main.jpg`} />
        <meta name="twitter:image:alt" content="blahX2" />
        <meta name="twitter:url" content={mainUrl} />
        <meta name="twitter:domain" content={publicRuntimeConfig.mainDomain} />
      </Head>
      <ServiceLayout title={`${userInfo.displayName}의 홈`} backgroundColor="gray.50" minHeight="100vh">
        <Box maxW="md" mx="auto" pt="6">
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden" mb="2" bg="white">
            <Box display="flex" p="6">
              <Flex p="6">
                <Avatar size="lg" src={userInfo.photoURL ?? anonymousUrl} mr="2" />
                <Flex direction="column" justify="center">
                  <Text fontSize="md">{userInfo.displayName}</Text>
                  <Text fontSize="xs">{userInfo.email}</Text>
                </Flex>
              </Flex>
            </Box>
          </Box>
          <Box borderWidth="1px" borderRadius="lg" p="2" overflow="hidden" bg="white">
            <Flex>
              <Box pt="1" pr="2">
                <Avatar
                  size="xs"
                  // https://bit.ly/broken-link: 존재하지 않는 이미지일 때 default 이미지 제공
                  // authUser의 photoURL 값도 없다면 default 이미지로 설정
                  src={isAnonymous ? anonymousUrl : authUser?.photoURL ?? anonymousUrl}
                />
              </Box>
              <Textarea
                bg="gray.100"
                border="none"
                boxShadow="none !important"
                placeholder="무엇이 궁금한가요?"
                borderRadius="md"
                resize="none"
                minH="unset"
                minRows={1}
                maxRows={7}
                overflow="hidden"
                fontSize="xs"
                mr="2"
                as={ResizeTextarea}
                value={message}
                onChange={(e) => {
                  // 최대 7줄만 스크린샷에 표현되니 7줄 넘게 입력하면 제한걸어야한다.
                  if (e.target.value) {
                    const lineCount = (e.target.value.match(/[^\n]*\n[^\n]*/gi)?.length ?? 1) + 1;
                    if (lineCount > 7) {
                      toast({
                        title: '최대 7줄까지만 입력가능합니다',
                        position: 'top-right',
                      });
                      return;
                    }
                  }
                  setMessage(e.target.value);
                }}
              />
              <Button
                disabled={message.length === 0}
                bgColor="#FFB86C"
                color="white"
                colorScheme="yellow"
                variant="solid"
                size="sm"
                onClick={async () => {
                  const postData: {
                    message: string;
                    uid: string;
                    author?: {
                      displayName: string;
                      photoURL?: string;
                    };
                  } = {
                    message,
                    uid: userInfo.uid,
                  };

                  if (!isAnonymous) {
                    postData.author = {
                      photoURL: authUser?.photoURL ?? anonymousUrl,
                      displayName: authUser?.displayName ?? 'anonymous',
                    };
                  }

                  const messageRes = await postMessage(postData);
                  if (!messageRes.result) {
                    toast({ title: '메시지 등록 실패', position: 'top-right' });
                  }
                  setMessage('');
                  setPage(1);
                  setTimeout(() => {
                    setMessageListFetchTrigger((prev) => !prev);
                  }, 50);
                }}
              >
                등록
              </Button>
            </Flex>
            <FormControl display="flex" alignItems="center" mt="1">
              <Switch
                size="sm"
                colorScheme="orange"
                id="anonymous"
                mr="1"
                isChecked={isAnonymous}
                onChange={() => {
                  if (!authUser) {
                    toast({
                      title: '로그인이 필요합니다',
                      position: 'top-right',
                    });
                    return;
                  }
                  setAnonymous((prev) => !prev);
                }}
              />
              <FormLabel htmlFor="anonymous" mb="0" fontSize="xx-small">
                Anonymous
              </FormLabel>
            </FormControl>
          </Box>
          <VStack spacing="12px" mt="6">
            {messageList.map((messageData: any) => (
              <MessageItem
                key={`message-item-${userInfo.uid}-${messageData.id}`}
                item={messageData}
                uid={userInfo.uid}
                screenName={screenName}
                displayName={userInfo.displayName ?? ''}
                photoURL={userInfo.photoURL ?? anonymousUrl}
                isOwner={isOwner!}
                onSendComplete={() => {
                  fetchMessageInfo({ uid: userInfo.uid, messageId: messageData.id });
                }}
              />
            ))}
          </VStack>
          {totalPages > page && (
            <Button
              width="full"
              mt="2"
              fontSize="sm"
              leftIcon={<TriangleDownIcon />}
              onClick={() => {
                setPage(page + 1);
              }}
            >
              더보기
            </Button>
          )}
        </Box>
      </ServiceLayout>
    </>
  );
};

export default UserHomePage;
