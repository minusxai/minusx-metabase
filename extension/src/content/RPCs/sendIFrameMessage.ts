import { configs } from "../../constants";

type IFrameKV = {
  key: string,
  value: any,
}

export const sendIFrameMessage = (payload: IFrameKV) => {
  const event = {
    type: 'STATE_SYNC',
    payload
  };
  const iframe = document.getElementById('minusx-iframe') as HTMLIFrameElement;
  if (!iframe) {
    return;
  }
  iframe?.contentWindow?.postMessage(event, configs.WEB_URL);
};
