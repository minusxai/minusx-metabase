export const FAKE_RESPONSES = [
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content: 'OK',
          contentType: 'text',
        },
      },
      {
        function: 'insertCellBelow',
        args: {
          cell_index: 1,
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 2,
          source: 'df.describe()',
        },
      },
      {
        function: 'executeCell',
        args: {
          cell_index: 2,
        },
      },
      {
        function: 'respondToUser',
        args: {
          content:
            "The dataframe (shape: (192, 5)) has columns: ['Country', 'Population density', 'GDP per capita', 'Population', 'Continent']",
          contentType: 'text',
        },
      },
    ],
  },
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content: 'Well well well',
          contentType: 'text',
        },
      },
      {
        function: 'insertCellBelow',
        args: {
          cell_index: 2,
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 3,
          source:
            "import plotly.express as px\rfig = px.scatter(df, x='Population density', y='GDP per capita')\rfig.show()",
        },
      },
      {
        function: 'executeCell',
        args: {
          cell_index: 3,
        },
      },
    ],
  },
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content: 'Here you go',
          contentType: 'text',
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 3,
          source:
            "import plotly.express as px\r# x axis is log, added title\rfig = px.scatter(df, x='Population density', y='GDP per capita', log_x=True, title='Population Density vs GDP')\rfig.show()",
        },
      },
      {
        function: 'executeCell',
        args: {
          cell_index: 3,
        },
      },
    ],
  },
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content: 'Hmmmm...',
          contentType: 'text',
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 3,
          source:
            "import plotly.express as px\r# x axis is log, added title\r# The color is now the continent and the population size describes the size of the points\rfig = px.scatter(df, x='Population density', y='GDP per capita', log_x=True, color='Continent', size='Population', title='Population density vs GDP')\rfig.show()",
        },
      },
      {
        function: 'executeCell',
        args: {
          cell_index: 3,
        },
      },
    ],
  },
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content: 'You got it',
          contentType: 'text',
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 3,
          source:
            "import plotly.express as px\r# x axis is log, added title\r# The color is now the continent and the population size describes the size of the points\r# The country's name will show up on the tooltip\rfig = px.scatter(df, x='Population density', y='GDP per capita', log_x=True, color='Continent', size='Population', title='Population Density vs GDP', hover_name='Country')\rfig.show()",
        },
      },
      {
        function: 'executeCell',
        args: {
          cell_index: 3,
        },
      },
    ],
  },
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content: 'Yoooo',
          contentType: 'text',
        },
      },
      {
        function: 'insertCellBelow',
        args: {
          cell_index: 3,
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 4,
          source:
            '# Calculate the average GDP per capita for each continent\raverage_gdp_per_capita = df.groupby("Continent").agg({"GDP per capita": "mean"})\r\r# Print the results\raverage_gdp_per_capita',
        },
      },
      {
        function: 'executeCell',
        args: {
          cell_index: 4,
        },
      },
    ],
  },
  {
    actions: [
      {
        function: 'respondToUser',
        args: {
          content:
            'You can find your link at: http://localhost:8888/voila/render/demo.ipynb',
          contentType: 'text',
        },
      },
      {
        function: 'insertCellBelow',
        args: {
          cell_index: 4,
        },
      },
      {
        function: 'setCellValue',
        args: {
          cell_index: 5,
          source:
            '# You can find your link at: http://localhost:8888/voila/render/demo.ipynb',
        },
      },
    ],
  },
];

export const FAKE_RESPONSE_METABASE = [
  {
    actions: [
      {
        function: 'updateSQLQuery',
        args: {
          sql: `SELECT
  "PUBLIC"."ORDERS"."ID" AS "ID",
  "PUBLIC"."ORDERS"."USER_ID" AS "USER_ID",
  "PUBLIC"."ORDERS"."PRODUCT_ID" AS "PRODUCT_ID",
  "PUBLIC"."ORDERS"."SUBTOTAL" AS "SUBTOTAL",
  "PUBLIC"."ORDERS"."TAX" AS "TAX",
  "PUBLIC"."ORDERS"."TOTAL" AS "TOTAL",
  "PUBLIC"."ORDERS"."DISCOUNT" AS "DISCOUNT",
  "PUBLIC"."ORDERS"."CREATED_AT" AS "CREATED_AT",
  "PUBLIC"."ORDERS"."QUANTITY" AS "QUANTITY"
FROM
  "PUBLIC"."ORDERS"
LIMIT
  5`,
          contentType: 'text',
        },
      },
    ],
  },
];

let fake_index = 0;

export const FAKE_GPT4_RESPONSE = {
  id: 'chatcmpl-9Kib356Vl3BEFQlW66YWBKnG6LqvF',
  object: 'chat.completion',
  created: 1714725017,
  model: 'gpt-3.5-turbo-0125',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_BsD2h0EIuIam8B1ZGOTfaQJx',
            type: 'function',
            function: {
              name: 'insertCellBelow',
              arguments: '{"cell_index":0,"cell_type":"CODE"}',
            },
          },
          {
            id: 'call_BsD2h0EIuIam8B1ZGOTfaQsd',
            type: 'function',
            function: {
              name: 'setCellValue',
              arguments: '{"cell_index":1,"source":"print(1)"}',
            },
          },
        ],
      },
      logprobs: null,
      finish_reason: 'stop',
    },
  ],
  usage: {
    prompt_tokens: 777,
    completion_tokens: 19,
    total_tokens: 796,
  },
  system_fingerprint: 'fp_a450710239',
};

export const getFakeResponse = () => {
  return FAKE_RESPONSES[fake_index++ % FAKE_RESPONSES.length];
};

export const MOCK_COMPLETION_1 = {
  "id": "chatcmpl-9PpZcOwaBbEv2X4Vz4PgtOEv0lJFs",
  "object": "chat.completion",
  "created": 1715943476,
  "model": "gpt-4-turbo-2024-04-09",
  "choices": [
      {
          "index": 0,
          "message": {
              "role": "assistant",
              "content": null,
              "tool_calls": [
                  {
                      "id": "call_xgnAsQCaHu0buvZniTZnARhV",
                      "type": "function",
                      "function": {
                          "name": "setCellValue",
                          "arguments": "{\"cell_index\": 1, \"source\": \"print('Hello, goood!')\"}"
                      }
                  },
                  {
                      "id": "call_mFR3f8h3xzi6VSIBeiUCCrd8",
                      "type": "function",
                      "function": {
                          "name": "executeCell",
                          "arguments": "{\"cell_index\": 1}"
                      }
                  },
                  {
                      "id": "call_nmZiUaQia0hmeSIWcf7K38Vq",
                      "type": "function",
                      "function": {
                          "name": "respondToUser",
                          "arguments": "{\"content\": \"I have updated and executed the second cell to print 'Hello, goood!' as requested.\"}"
                      }
                  }
              ]
          },
          "logprobs": null,
          "finish_reason": "stop"
      }
  ],
  "usage": {
      "prompt_tokens": 615,
      "completion_tokens": 86,
      "total_tokens": 701
  },
  "system_fingerprint": "fp_e9446dc58f"
}