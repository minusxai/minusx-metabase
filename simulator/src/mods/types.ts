import { Frame, Page } from "playwright/test";

interface TestModArg {
    frame: Frame;
    page: Page
}

export type TestMod = (modArg: TestModArg) => Promise<void>
