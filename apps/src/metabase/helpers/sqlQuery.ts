// helpers for generating metabase sql query related actions (specifically qb/UPDATE_QUESTION)
import type { QBParameters, QBTemplateTags } from "./types";
import { v4 as uuidv4 } from 'uuid';

type VarAndUuids = {
  variable: string,
  uuid: string
}[]

 // not using this right now, but might be useful later?
export const getVariablesAndUuidsInQuery = (query: string): VarAndUuids => {
  // using map to dedupe
  let asMap: Record<string, string> = {};
  const regex = /{{\s*(\w+)\s*}}/g;
  let match;
  while ((match = regex.exec(query)) !== null) {
    asMap[match[1]] = uuidv4();
  }
  return Object.entries(asMap).map(([key, value]) => ({ variable: key, uuid: value }));
}

export type SnippetTemplateTag = {
  "display-name": string,
  id: string, // this is the uuid
  name: string, // this looks like "snippet: snippetName"
  "snippet-id": number,
  "snippet-name": string // this is just snippetName
  type: "snippet"
}

function slugToDisplayName(slug: string): string {
  return slug
    .split('_')                  // Split the string by underscores
    .map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )                             // Capitalize the first letter of each word
    .join(' ');                   // Join the words back with spaces
}


export function getTemplateTags(varsAndUuids: VarAndUuids, existingTemplateTags: QBTemplateTags): QBTemplateTags {
  let templateTags: QBTemplateTags = {};
  for (const {variable, uuid} of varsAndUuids) {
    if (existingTemplateTags[variable]) {
      templateTags[variable] = existingTemplateTags[variable];
    } else {
      // create a new template tag
      templateTags[variable] = {
        id: uuid,
        type: 'text',
        name: variable,
        'display-name': slugToDisplayName(variable)
      }
    }
  }
  return templateTags;
}

export function getParameters(varsAndUuids: VarAndUuids, existingParameters: QBParameters): QBParameters {
  let parameters: QBParameters = [];
  for (const {variable, uuid} of varsAndUuids) {
    // search in existing parameters to see if varName already exists
    let existingParameter = existingParameters.find(param => param.slug === variable);
    if (existingParameter) {
      parameters.push(existingParameter);
    } else {
      // create a new parameter
      parameters.push({
        id: uuid,
        type: 'category',
        target: [
          'variable',
          [
            'template-tag',
            variable
          ]
        ],
        name: slugToDisplayName(variable),
        slug: variable
      });
    }
  }
  return parameters;
}

