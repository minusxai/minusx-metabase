import type { QuerySelectorMap } from "extension/types";
import { get } from "lodash";
import { RPCs, utils } from "web";
import { DefaultMessageContent } from "web/types"
import 'reflect-metadata';

interface App<T> {
  getState: () => Promise<T>;
  getQuerySelectorMap: () => Promise<QuerySelectorMap>;
}

interface ActionMetadata {
  labelRunning: string;
  labelDone: string;
  description: string;
  renderBody: Function;
}

export function Action(metadata: ActionMetadata) {
  return function (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    // Attach metadata to the method using Reflect API
    Reflect.defineMetadata('actionMetadata', metadata, target, propertyKey);
  };
}
export abstract class AppController<T> {
  protected app: App<T>;

  constructor(app: App<T>) {
    this.app = app;
  }

  // 0. Exposed actions --------------------------------------------
  @Action({
    labelRunning: "Completing task",
    labelDone: "Task Done",
    description: "Marks the task as done if the users' task is accomplished.",
    renderBody: ({ taskDone }: { taskDone: boolean }) => {
      return {text: null, code: null}
    }
  })
  async markTaskDone({ taskDone }: { taskDone: boolean }) {
    return;
  }

  @Action({
    labelRunning: "Responding to user",
    labelDone: "Reply Sent",
    description: "Responds to the user with the given content.",
    renderBody: ({ content }: { content: string }) => {
      return {text: null, code: null}
    }
  })
  talkToUser({ content }: { content: string }) {
    return this.respondToUser({ content });
  }
  

  // 1. Internal actions --------------------------------------------
  respondToUser({ content }: { content: string }) {
    const actionContent: DefaultMessageContent = {
      type: "DEFAULT",
      text: content,
      images: [],
    };
    return actionContent;
  }

  async wait({ time }: { time: number }) {
    await utils.sleep(time);
  }

  async uClick({ query, index = 0 }) {
    const selectorMap = await this.app.getQuerySelectorMap();
    const selector = selectorMap[query];
    return await RPCs.uClick(selector, index);
  }

  async uDblClick({ query, index = 0 }) {
    const selectorMap = await this.app.getQuerySelectorMap();
    const selector = selectorMap[query];
    return await RPCs.uDblClick(selector, index);
  }

  async scrollIntoView({ query, index = 0 }) {
    const selectorMap = await this.app.getQuerySelectorMap();
    const selector = selectorMap[query];
    return await RPCs.scrollIntoView(selector, index);
  }

  async uHighlight({ query, index = 0 }) {
    const selectorMap = await this.app.getQuerySelectorMap();
    const selector = selectorMap[query];
    return await RPCs.uHighlight(selector, index);
  }

  async setValue({ query, value = "", index = 0 }) {
    const selectorMap = await this.app.getQuerySelectorMap();
    const selector = selectorMap[query];
    await getRippleEffect(selector, index);
    await this.uDblClick({ query, index });
    await RPCs.typeText(selector, '{ArrowLeft}', index)
    await RPCs.uSelectAllText(true)
    await RPCs.dragAndDropText(selector, value, index)
    await RPCs.typeText(selector, '{ArrowLeft}', index)
  }

  async runAction(fn: string, args: any) {
    // @ts-ignore: Check if controller has function and execute!
    return await this[fn](args);
  }
}

const getRippleEffect = async (selector, index) => {
  const queryResponse = await RPCs.queryDOMSingle({ selector });
  const coords = get(queryResponse, `[${index}].coords`);
  if (coords) {
    const { x, y } = coords;
    const rippleTime = 500;
    const numRipples = 2;
    RPCs.ripple(x, y, rippleTime, {
      "background-color": "rgba(22, 160, 133, 1.0)",
      animation: `web-agent-ripple ${
        rippleTime / (1000 * numRipples)
      }s infinite`,
    });
  }
};
