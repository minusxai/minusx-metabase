import defaults from './env.defaults.json'

interface ENV {
    TEST_EMAIL: string,
    TEST_OTP: string,
}

export const configs: ENV = {
    TEST_EMAIL: process.env.TEST_EMAIL || defaults.TEST_EMAIL,
    TEST_OTP: process.env.TEST_EMAIL || defaults.TEST_EMAIL,
}