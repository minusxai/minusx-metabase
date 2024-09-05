import { AppController } from "../base/appController";
import { getSqlQueryMetadata, memoizedGetCurrentProjectDatabaseSchema } from "./api";
import { PosthogAppState } from "./types";
import { BlankMessageContent } from "web/types"; 
import { getSqlErrorMessageFromDOM, getAndFormatOutputTable, waitForQueryExecution } from "./operations";
import { querySelectorMap } from "./querySelectorMap";
import { RPCs } from "web";
import expressionsMd from "./docs/expressions.md";

export class PosthogController extends AppController<PosthogAppState> {
  async getTableSchemasById({ ids }: { ids: string[] }) {
    const actionContent: BlankMessageContent = { type: "BLANK" };
    // need to fetch schemas
    const dbSchema = await memoizedGetCurrentProjectDatabaseSchema();
    const tables = dbSchema
      .filter((table) => ids.includes(table.id))
      .map((table) => ({
        id: table.id,
        name: table.name,
        ...(table.type == "data_warehouse" ? { schema: table.schema?.name } : {}),
        columns: Object.values(table.fields).map((field) => ({
          name: field.name,
          type: field.type,
        })),
      }));
    const tableSchemasContent = JSON.stringify(tables);
    actionContent.content = tableSchemasContent;
    return actionContent;
  }

  async updateHogQLQueryAndExecute({ query }: { query: string }) {
    const actionContent: BlankMessageContent = {
      type: "BLANK",
    };
    // await this.uClick({ query: "hogql_query" });
    // // TODO: figure out a better way or some selector to wait on instead of 100 ms delays
    // await this.wait({ time: 100})
    // await RPCs.uSelectAllText(false);
    // await this.wait({ time: 100})
    // await RPCs.typeText(querySelectorMap["hogql_query"], sql);

    await RPCs.uDblClick(querySelectorMap["hogql_query"]);
    await this.wait({ time: 100})
    // await RPCs.typeText(querySelectorMap["hogql_query"], "{Home}")
    await RPCs.uSelectAllText(true, ['cut']);
    // await this.wait({ time: 500})
    // await RPCs.typeText(querySelectorMap["hogql_query"], "{Backspace}{Backspace}{Backspace}{Backspace}")
    // await this.wait({ time: 100})
    // await RPCs.typeText(querySelectorMap["hogql_query"], "{Backspace}")
    // await RPCs.typeText(querySelectorMap["hogql_query"], "{Home} ")

    // Need some event to reset Monaco
    await this.wait({ time: 100})
    await RPCs.typeText(querySelectorMap["hogql_query"], query)
    // do metadata request and check for errors
    const sqlQueryMetadata = await getSqlQueryMetadata(query);
    if (sqlQueryMetadata && sqlQueryMetadata.errors.length > 0) {
      // stringify all the errors as is
      const errorMessage = JSON.stringify(sqlQueryMetadata.errors);
      actionContent.content = errorMessage;
    } else {
      // no error, can run. need to wait for the run button to be enabled? todo
      await this.wait({ time: 100})
      await this.uClick({ query: "run_button" });
      await waitForQueryExecution();
      const sqlErrorMessage = await getSqlErrorMessageFromDOM();
      if (sqlErrorMessage) {
        actionContent.content = "Error: " + sqlErrorMessage;
      } else {
        // table output
        const tableOutput = await getAndFormatOutputTable();
        actionContent.content = tableOutput;
      }
    }
    return actionContent;
  }
  async getHogQLExpressionsDocumentation() {
    return expressionsMd;
  }
}
