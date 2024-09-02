const base_constants = {
    JUPYTER_SERVER_URL: 'http://localhost:8888',
    JUPYTER_TOKEN: 'jupyter_test_token'
}

export const constants = {
    ...base_constants,
    JUPYTER_SERVER_PATH: `${base_constants.JUPYTER_SERVER_URL}/lab/tree/data`
}