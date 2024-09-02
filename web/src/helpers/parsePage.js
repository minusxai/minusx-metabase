import { getState } from '../../state/store';
import _ from 'lodash';

export async function getParsedPage(pageDOM) {
  // const query_selectors = {
  //   select_cell,
  //   run_cell,
  //   delete_cell,
  //   insert_cell_below,
  //   insert_cell_above,
  // };
  const maxAttempts = 3;
  const { model, apiKey } = getState().settings
  const systemMessage = `You are the world's best scraper and a master of jupyter notebooks.
  You need to scrape the page DOM to convert it into the JSON that the user requests. Always respond in JSON form.`;

  const prompt = `This is the simplified DOM of a jupyter notebook:

${pageDOM.outerHTML}

Give me query selectors that that work on this DOM. Do not use ID in the query selectors. I need query selectors the following:

1. Selecting a cell
2. Running a cell
3. Deleting a cell
4. Inserting a cell below
5. Inserting a cell above

Respond using this JSON Format:
{
  'query_selectors': {
    'select_cell': <Selecting a cell>,
    'run_cell': <Running a cell>,
    'delete_cell': <Deleting a cell>,
    'insert_cell_below': <Inserting a cell below>,
    'insert_cell_above': <Inserting a cell above>,
  }
}
If no selector exists, the value shoudl be "NONE"
`;
  if (!apiKey) {
    return null;
  }
  try {
    const openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true,
    });
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const completion = await openai.chat.completions.create({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            { role: 'user', content: prompt },
          ],
          // max_tokens: 1000,
          temperature: 0,
          response_format: { type: 'json_object' },
        });
        const response = JSON.parse(
          _.get(completion, ['choices', 0, 'message', 'content'], {})
        );
        return response;
      } catch (error) {
        const errorMessage = _.get(error, 'response.data.error.message', '');
        if (errorMessage.includes('server error')) {
          console.log('Server error', errorMessage);
        } else {
          // Another error, give up
          throw new Error(errorMessage);
        }
      }
    }
  } catch (err) {
    console.log('Unexpected error', err);
    throw err;
  }
}