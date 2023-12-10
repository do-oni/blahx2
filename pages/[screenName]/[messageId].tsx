import { GetServerSideProps, NextPage } from 'next';
import { Avatar, Box, Flex, Text } from '@chakra-ui/react';
import axios, { AxiosResponse } from 'axios';
import { useState } from 'react';
import Head from 'next/head';
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
  messageData: InMessage | null;
  screenName: string;
  baseUrl: string;
}

const MessagePage: NextPage<Props> = function ({ userInfo, messageData: initMsgData, screenName, baseUrl }) {
  const { authUser } = useAuth();
  const [messageData, setMessageData] = useState<null | InMessage>(initMsgData);

  async function fetchMessageInfo({ uid, messageId }: { uid: string; messageId: string }) {
    try {
      const res = await fetch(`/api/messages.info?uid=${uid}&messageId=${messageId}`);
      if (res.status === 200) {
        const data: InMessage = await res.json();
        setMessageData(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (!userInfo) {
    return <p>사용자를 찾을 수 없습니다.</p>;
  }
  if (!messageData) {
    return <p>메시지 정보가 없습니다.</p>;
  }
  const anonymousUrl = 'https://bit.ly/broken-link';
  const isOwner = authUser && authUser.uid === userInfo.uid;
  const metaImgUrl = `${baseUrl}/open-graph-img?text=${encodeURIComponent(messageData.message)}`;
  const thumbnailImgUrl = `${baseUrl}/api/thumbnail?url=${encodeURIComponent(metaImgUrl)}`;

  return (
    <>
      <Head>
        <meta property="og:image" content={thumbnailImgUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@blahx2" />
        <meta name="twitter:title" content={messageData.message} />
        <meta name="twitter:image" content={messageData.message} />
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
          <MessageItem
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
        </Box>
      </ServiceLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps<Props> = async ({ query }) => {
  const { screenName, messageId } = query;
  if (!screenName) {
    return {
      props: {
        userInfo: null,
        messageData: null,
        screenName: '',
        baseUrl: '',
      },
    };
  }
  if (!messageId) {
    return {
      props: {
        userInfo: null,
        messageData: null,
        screenName: '',
        baseUrl: '',
      },
    };
  }
  try {
    const protocol = process.env.PROTOCOL || 'http';
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || '3000';
    const baseUrl = `${protocol}://${host}:${port}`;
    const userInfo: AxiosResponse<InAuthUser> = await axios(`${baseUrl}/api/users.info/${screenName}`);
    const screenNameToStr = Array.isArray(screenName) ? screenName[0] : screenName;

    if (userInfo.status !== 200 || !userInfo.data || !userInfo.data.uid) {
      return {
        props: {
          userInfo: null,
          messageData: null,
          screenName: '',
          baseUrl: '',
        },
      };
    }

    const messageInfo: AxiosResponse<InMessage> = await axios(
      `${baseUrl}/api/messages.info?uid=${userInfo.data.uid}&messageId=${messageId}`,
    );

    return {
      props: {
        userInfo: userInfo.data,
        messageData: messageInfo.status !== 200 || !messageInfo.data ? null : messageInfo.data,
        screenName: screenNameToStr,
        baseUrl,
      },
    };
  } catch (err) {
    console.error(err);
    return {
      props: {
        userInfo: null,
        messageData: null,
        screenName: '',
        baseUrl: '',
      },
    };
  }
};

export default MessagePage;
