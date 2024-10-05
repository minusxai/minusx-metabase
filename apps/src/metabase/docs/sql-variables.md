# SQL Variables
You can create SQL templates by adding variables to your SQL queries in the [Native/SQL editor](https://www.metabase.com/docs/latest/questions/native-editor/writing-sql). These variables will create filter widgets that you can use to change the variable's value in the query. You can also add variables to your question's URL to set the filters' values, so that when the question loads, those values are inserted into the variables.

![Variables](https://www.metabase.com/docs/latest/questions/images/02-widget.png)

Defining variables
------------------

Typing `{{variable_name}}` in your native query creates a variable called `variable_name`.

Field Filters, a special type of filter, have a [slightly different syntax](#field-filter-syntax).

This example defines a **Text** variable called `category`:

```

SELECT
  count(*)
FROM
  products
WHERE
  category = {{category}}


```


Metabase will read the variable and attach a filter widget to the query, which people can use to change the value inserted into the `cat` variable with quotes. So if someone entered “Gizmo” into the filter widget, the query Metabase would run would be:

```
SELECT
  count(*)
FROM
  products
WHERE
  category = 'Gizmo'

```


Setting SQL variables
---------------------

To set a SQL variable to a value, you can use the setVariableValue tool.

Setting complex default values in the query
-------------------------------------------

You can also define default values directly in your query by enclosing comment syntax inside the end brackets of an optional variable.

```
WHERE column = [[ {{ your_variable }} --]] your_default_value

```


The comment will “activate” whenever you pass a value to `your_variable`.

This is useful when defining complex default values (for example, if your default value is a function like `CURRENT_DATE`). Here's a PostgreSQL example that sets the default value of a Date filter to the current date using `CURRENT_DATE`:

```

SELECT
  *
FROM
  orders
WHERE
  DATE(created_at) = [[ {{dateOfCreation}} --]] CURRENT_DATE


```


If you pass a value to the variable, the `WHERE` clause runs, including the comment syntax that comments out the default `CURRENT_DATE` function.

Note that the hash (`--`) used to comment the text might need to be replaced by the comment syntax specific to the database you're using.

In the **Variable** settings sidebar, you can toggle the **Always require a value** option. If you turn this on:

*   You must enter a default value.
*   The default value will override any optional syntax in your code (like an optional `WHERE` clause). If no value is passed to the filter, Metabase will run the query using the default value. Click on the **Eye** icon in the editor to preview the SQL Metabase will run.

Making variables optional
-------------------------

You can make a clause optional in a query. For example, you can create an optional `WHERE` clause that contains a SQL variable, so that if no value is supplied to the variable (either in the filter or via the URL), the query will still run as if there were no `WHERE` clause.

To make a variable optional in your native query, put `[[ .. ]]` brackets around the entire clause containing the `{{variable}}`. If someone inputs a value in the filter widget for the `variable`, Metabase will place the clause in the template; otherwise Metabase will ignore the clause and run the query as though the clause didn't exist.

In this example, if no value is given to `cat`, then the query will just select all the rows from the `products` table. But if `cat` does have a value, like “Widget”, then the query will only grab the products with a category type of Widget:

```

SELECT
  count(*)
FROM
  products
[[WHERE category = {{cat}}]]


```


### Your SQL must also be able to run without the optional clause in `[[ ]]`

You need to make sure that your SQL is still valid when no value is passed to the variable in the bracketed clause.

For example, excluding the `WHERE` keyword from the bracketed clause will cause an error if there's no value given for `cat`:

```
-- this will cause an error:

SELECT
  count(*)
FROM
  products
WHERE
  [[category = {{cat}}]]


```


That's because when no value is given for `cat`, Metabase will try to execute SQL as if the clause in `[[ ]]` didn't exist:

```
SELECT
  count(*)
FROM
  products
WHERE

```


which is not a valid SQL query.

Instead, put the entire `WHERE` clause in `[[ ]]`:

```

SELECT
  count(*)
FROM
  products
[[WHERE
  category = {{cat}}]]


```


When there's no value given for `cat`, Metabase will just execute:

```

SELECT
  count(*)
FROM
  products


```


which is still a valid query.

### You need at least one `WHERE` when using multiple optional clauses

To use multiple optional clauses, you must include at least one regular `WHERE` clause followed by optional clauses, each starting with `AND`:

```

SELECT
  count(*)
FROM
  products
WHERE
  TRUE
  [[AND id = {{id}}]
  [[AND {{category}}]]


```


That last clause uses a Field filter (note the lack of a column in the `AND` clause). When using a field filter, you must exclude the column in the query; you need to map the variable in the side panel.
