import { getTablesFromSqlRegex, type TableAndSchema } from "./parseSql";

describe('getTablesFromSqlRegex', () => {
  const sqlStatementsAndResults: { sql: string, results: TableAndSchema[] }[] = [
    // simple select
    {
      sql: `
      SELECT * 
      FROM user_activity.events_log 
      WHERE event_status IS 'active';
    `,
      results: [
        { schema: 'user_activity', name: 'events_log' }
      ]
    },
    // another simple select
    {
      sql:
        `
    SELECT user_id 
    FROM platform_data.user_profiles;
    `,
      results: [
        { schema: 'platform_data', name: 'user_profiles' }
      ]
    }
    ,
    // with statement
    {
      sql: `
      WITH recent_orders AS (
          SELECT * 
          FROM sales_data.order_details
      )
      SELECT alias.order_id 
      FROM recent_orders alias;
    `,
      results: [
        { schema: 'sales_data', name: 'order_details' },
        { schema: '', name: 'recent_orders' }
      ]
    }
    ,
    // quotes and spaces
    {
      sql: `
      SELECT
          "source"."event_id" AS "EventID",
          "source"."user_id" AS "UserID",
          "source"."event_type" AS "EventType",
          "source"."event_timestamp" AS "EventTimestamp",
          "source"."page_viewed" AS "PageViewed",
          "source"."button_label" AS "ButtonLabel"
      FROM
      (
          SELECT
          "analytics"."event_tracking"."event_id" AS "event_id",
          "analytics"."event_tracking"."user_id" AS "user_id",
          "analytics"."event_tracking"."event_type" AS "event_type",
          "analytics"."event_tracking"."event_timestamp" AS "event_timestamp",
          "analytics"."event_tracking"."page_viewed" AS "page_viewed",
          "analytics"."event_tracking"."button_label" AS "button_label"
          FROM
          "analytics"."event tracking"
      ) AS "source"
      LIMIT 1048575;
      `,
      results: [
        { schema: 'analytics', name: 'event tracking' }
      ]
    }
    ,
    // lots of tables
    {
      sql: `
      SELECT 
          monthly_period,
          AVG(session_duration) AS avg_duration,
          customer_segment,
          activity_type
      FROM (
          SELECT 
              customer.customer_id,
              session_data.session_start,
              session_data.session_end,
              TO_CHAR(session_data.session_start, 'YYYY-MM') AS start_period,
              TO_CHAR(session_data.session_end, 'YYYY-MM') AS end_period,
              session_data.duration_in_minutes,
              NULL AS total_spend,
              (SELECT segment_definitions.segment_name 
              FROM purchase_transactions transactions 
              INNER JOIN transaction_metadata metadata ON metadata.transaction_id = transactions.id
              INNER JOIN segment_definitions ON segment_definitions.id = metadata.segment_id
              WHERE transactions.type = 'purchase'
              AND transactions.status != 'refunded'
              AND transactions.customer_id = customer.customer_id
              LIMIT 1) AS customer_segment,
              CASE 
                  WHEN session_histories.session_data_id IS NULL THEN 
                      CASE 
                          WHEN (EXTRACT(EPOCH FROM (session_data.session_end - session_data.session_start))/86400) > 2 THEN 2
                          ELSE (EXTRACT(EPOCH FROM (session_data.session_end - session_data.session_start))/86400)
                      END
                  ELSE durations.total_duration
              END AS session_duration,
              CASE 
                  WHEN session_histories.session_data_id IS NULL THEN 'New_Session'
                  ELSE 'Returning_Session'
              END AS activity_type
          FROM customer_sessions customer 
          INNER JOIN session_details session_data ON session_data.customer_id = customer.customer_id
          LEFT JOIN (
              SELECT COUNT(1), session_data_id 
              FROM session_histories 
              WHERE reason_code IN ('error-101', 'error-102', 'timeout', 'disconnect')
              GROUP BY session_data_id 
          ) session_histories ON session_histories.session_data_id = session_data.id
          LEFT JOIN session_durations durations ON durations.session_data_id = session_data.id
      ) as sessions_derived;
    `,
      results: [
        { schema: '', name: 'purchase_transactions' },
        { schema: '', name: 'transaction_metadata' },
        { schema: '', name: 'segment_definitions' },
        { schema: '', name: 'customer_sessions' },
        { schema: '', name: 'session_details' },
        { schema: '', name: 'session_histories' },
        { schema: '', name: 'session_durations' },
      ]
    }
    ,
    // filters example
    {
      sql: `
      SELECT 
          created_at,
          store_location AS location_name, 
          CASE
              WHEN store_category = 0 THEN 'Retail'
              WHEN store_category = 1 THEN 'Warehouse'
              WHEN store_category = 2 THEN 'Distribution'
              ELSE 'Other'
          END AS store_type, 
          CASE 
              WHEN store_size = 0 THEN 'Small'
              WHEN store_size = 1 THEN 'Medium'
              WHEN store_size = 2 THEN 'Large'
          END AS store_size, 
          CASE
              WHEN region_code = 10 THEN 'North'
              ELSE 'South'
          END AS region, 
          address_line AS address, 
          unit_number AS unit, 
          floor_section AS section, 
          manager_first_name AS first_name, 
          manager_last_name AS last_name, 
          contact_number AS contact_number
      FROM store_locations
      WHERE {{store_type_filter}}
      AND {{store_size_filter}}
      AND {{created_at_filter}}
      AND {{region_filter}}
      ORDER BY created_at DESC;
    `,
      results: [
        { schema: '', name: 'store_locations' }
      ]
    },
    // optional filter example
    {
      sql: `
      SELECT count(*)
      FROM products
      WHERE 1=1
        [[AND id = {{id}}]]
        [[AND category = {{category}}]]
      `,
      results: [
        { schema: '', name: 'products' }
      ]
    },
    // foreign language example
    {
      sql: `
      SELECT nombre, apellido 
      FROM públicó.usuarios 
      WHERE estado = 'activo';
      `,
      results: [
        { schema: 'públicó', name: 'usuarios' }
      ]
    },
    // join
    {
      sql: `
      WITH daily_messages AS (
          SELECT 
              p.login_email_id as email, 
              ur.profile_id, 
              DATE(ur.created_at) as "day", 
              COUNT(*) as "daily_messages"
          FROM 
              public.user_records ur
          JOIN 
              public.profiles p ON ur.profile_id = p.id
          WHERE 
              ur.created_at >= NOW() - INTERVAL '10 days' 
              AND ur.type = 'user_message'
              AND ur.model != 'gpt-4o-mini'
          GROUP BY 
              p.login_email_id, 
              ur.profile_id, 
              DATE(ur.created_at)
      ), ranked_messages AS (
          SELECT 
              email, 
              profile_id, 
              "day", 
              daily_messages,
              RANK() OVER (PARTITION BY "day" ORDER BY daily_messages DESC) as rank
          FROM daily_messages
      )
      SELECT 
          CASE WHEN rank <= 20 THEN email ELSE 'others' END as email, 
          "day", 
          SUM(daily_messages) as daily_messages
      FROM ranked_messages
      GROUP BY "day", CASE WHEN rank <= 20 THEN email ELSE 'others' END
      ORDER BY "day" DESC, daily_messages DESC;
      `,
      results: [
        { schema: 'public', name: 'user_records' },
        { schema: 'public', name: 'profiles' },
        { schema: '', name: 'daily_messages' },
        { schema: '', name: 'ranked_messages' }
      ]
    },
    // same table multiple times (we actually return both, doesn't matter, dedup is done later anyway)
    {
      sql: `
      WITH dummy1 AS (
            SELECT * from some_schema.some_table
            WHERE some_column = 'some_value'
      ),
      dummy2 AS (
            SELECT * from some_schema.some_table
            WHERE some_column = 'some_value'
      )
            SELECT * FROM dummy1 JOIN dummy2 ON dummy1.some_column = dummy2.some_column
            ORDER BY some_column;
      `,
      results: [
        { schema: 'some_schema', name: 'some_table' },
        { schema: 'some_schema', name: 'some_table' },
        { schema: '', name: 'dummy1' },
        { schema: '', name: 'dummy2' }
      ]

    },
    // dashes in table example
    {
      sql: `SELECT * from "some-schema"."some-table";`,
      results: [
        { schema: 'some-schema', name: 'some-table' }
      ]
    },
    // only schema quoted
    {
      sql: `SELECT * from "some-schema".sometable;`,
      results: [
        { schema: 'some-schema', name: 'sometable' }
      ]
    },
    // only table quoted
    {
      sql: `SELECT * from someschema."some-table";`,
      results: [
        { schema: 'someschema', name: 'some-table' }
      ]
    },
  ];
  for (const { sql, results } of sqlStatementsAndResults) {
    it(`should get the correct tables from sql: ${sql}`, () => {
      const tables = getTablesFromSqlRegex(sql);
      expect(tables).toEqual(results);
    });
  }
});
