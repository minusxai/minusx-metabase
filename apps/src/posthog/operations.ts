import { RPCs } from "web"; 
import { querySelectorMap, outputTableQuery } from "./querySelectorMap";
import { sleep } from "../common/utils";
import { memoizedGetPosthogEventDefinitions } from "./api";
import hardcodedDescriptionsAll from "./docs/hardcoded-descriptions-all";
import { PosthogEventDefinitionQueryResponse } from "./api";
export const waitForQueryExecution = async () => {
 // TODO
 while(true) {
  let isExecuting = await RPCs.queryDOMSingle({
      selector: querySelectorMap["cancel_button"],
    });
    if (isExecuting.length == 0) {
      break;
    }
    await sleep(100);
  }
}

export const getSqlErrorMessageFromDOM = async () => {
  let errorMessage = await RPCs.queryDOMSingle({
    selector: querySelectorMap["sql_error_message"],
  });
  return (errorMessage as any)?.[0]?.attrs?.text;
}

interface OutputTableQueryResponseFirstElement {
  children: {
    headers?: {
      children: {
        cells?: {
          attrs: {
            text: string
          }
        }[]
      }
    }[]
    rows?: {
      children: {
        cells?: {
          attrs: {
            text: string
          }
        }[]
      }
    }[]
  }
}

function convertToMarkdown(table: OutputTableQueryResponseFirstElement): string {
  let markdown = '';
  // Check if headers are present and not empty
  if (table.children.headers && table.children.headers.length > 0) {
    const headerRow = table.children.headers[0].children.cells?.map(cell => cell.attrs.text) || [];
    if (headerRow.length > 0) {
      markdown += `| ${headerRow.join(' | ')} |\n`;
      markdown += `| ${headerRow.map(() => '---').join(' | ')} |\n`;
    }
  }
  // Convert rows to markdown if present
  if (table.children.rows) {
    table.children.rows.forEach(row => {
      const rowText = row.children.cells?.map(cell => cell.attrs.text) || [];
      markdown += `| ${rowText.join(' | ')} |\n`;
    });
  }
  return markdown;
}


export const getAndFormatOutputTable = async () => {
  // TODO
  let outputTable = await RPCs.queryDOMSingle(outputTableQuery);
  let outputTableMarkdown = ""
  if (outputTable && outputTable.length > 0) {
    outputTableMarkdown = convertToMarkdown(outputTable[0] as OutputTableQueryResponseFirstElement);
  }
  // truncate if more than 2k characters. add an ...[truncated]
  if (outputTableMarkdown.length > 2000) {
    outputTableMarkdown = outputTableMarkdown.slice(0, 2000) + '...[truncated]';
  }
  return outputTableMarkdown;
}

export const getSqlQuery = async () => {
  let sqlQuery = await RPCs.queryDOMSingle({
    selector: querySelectorMap["sql_read"],
  });
  return sqlQuery?.map((row) => row?.attrs?.text).join('\n');
}

interface EventDefinitionWithDescription {
  name: string;
  label?: string;
  description?: string;
  examples?: string[];
}

export const getDescriptionsForEventDefinitions = (eventDefinitions: PosthogEventDefinitionQueryResponse) => {
  const hardcodedEventDescriptions = hardcodedDescriptionsAll["events"] as Record<string, any>;
  if (eventDefinitions && eventDefinitions.count > 0) {
    const eventDefinitionsWithDescriptions: EventDefinitionWithDescription[] = eventDefinitions.results
    .map((eventDefinition: any) => {
      let eventDefinitionWithDescription: EventDefinitionWithDescription = {
        name: eventDefinition.name,
      };
      if (hardcodedEventDescriptions[eventDefinition.name]) {
        eventDefinitionWithDescription.description = hardcodedEventDescriptions[eventDefinition.name].description;
        if (hardcodedEventDescriptions[eventDefinition.name].label) {
          eventDefinitionWithDescription.label = hardcodedEventDescriptions[eventDefinition.name].label;
        }
        if (hardcodedEventDescriptions[eventDefinition.name].examples) {
          eventDefinitionWithDescription.examples = hardcodedEventDescriptions[eventDefinition.name].examples;
        }
      }
      return eventDefinitionWithDescription;
    });
    return eventDefinitionsWithDescriptions;
  } else {
    console.warn("No event definitions found");
    return [];
  }
}

// format as a single yaml string
export const formatEventDescriptionsAsYaml = (eventDefsWithDescriptions: EventDefinitionWithDescription[]) => {
  let eventDefinitionsAndDescriptions = eventDefsWithDescriptions.map((eventDefinitionWithDescription: EventDefinitionWithDescription) => {
    let eventDefinitionAndDescription = `"${eventDefinitionWithDescription.name}":`;
    if (eventDefinitionWithDescription.label) {
      eventDefinitionAndDescription += ` # label: ${eventDefinitionWithDescription.label}`;
    }
    if (eventDefinitionWithDescription.description) {
      eventDefinitionAndDescription += ` # ${eventDefinitionWithDescription.description}`;
    }
    if (eventDefinitionWithDescription.examples) {
      eventDefinitionAndDescription += `\n  examples:\n    - ${eventDefinitionWithDescription.examples.join('\n    - ')}`;
    }
    return eventDefinitionAndDescription;
  }).join('\n');
  return eventDefinitionsAndDescriptions;
}