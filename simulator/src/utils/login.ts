import { Frame } from '@playwright/test';
import { configs } from '../constants';

export const login = async (frame: Frame) => {
  await frame.getByLabel('Enter Email').fill(configs.TEST_EMAIL)
  await frame.getByLabel('Sign in').click()
  await frame.getByLabel('Enter OTP').fill(configs.TEST_OTP)
  await frame.getByLabel('Verify OTP').click()
}