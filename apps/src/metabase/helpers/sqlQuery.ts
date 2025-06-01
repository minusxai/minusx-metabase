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

export type ModelTemplateTag = {
  "card-id": number,
  "display-name": string,
  id: string, // this is the uuid
  name: string, // this looks like "#{modelNumber}-{modelSlug}"
  type: "card"
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


export type MetabaseStateSnippetsDict = {
  [key: string]: {
    name: string,
    id: number
  }
};

export const getSnippetsInQuery = (query: string, allSnippets: MetabaseStateSnippetsDict): {[key: string]: SnippetTemplateTag} => {
  const regex = /{{(\s*snippet:\s*(\w+)\s*)}}/g;
  let match;
  let tags: SnippetTemplateTag[] = [];
  while ((match = regex.exec(query)) !== null) {
    const fullSnippetIdentifier = match[1];
    const snippetName = match[2];
    // search in allSnippets by snippetName to find the id
    // the id is the key in allSnippets
    let snippetId = Object.keys(allSnippets).find(id => allSnippets[id].name === snippetName);
    if (!snippetId) {
      console.warn(`[minusx] Snippet ${snippetName} not found in allSnippets`);
      snippetId = ""
    }
    tags.push({
      "display-name": slugToDisplayName(snippetName),
      id: uuidv4(),
      name: fullSnippetIdentifier,
      "snippet-id": parseInt(snippetId),
      "snippet-name": snippetName,
      type: "snippet"
    })
  }
  // convert to dictionary with name as key
  return Object.fromEntries(tags.map(tag => [tag.name, tag]))
}

export const getModelsInQuery = (query: string) => {
  // it looks like {{#{modelNumber}-{modelSlug}}}
  const regex = /{{(\s*#(\d+)-([\w-]+)\s*)}}/g;
  let match;
  let tags: ModelTemplateTag[] = [];
  while ((match = regex.exec(query)) !== null) {
    // extract all three parts; the full match, the number, and the slug
    const [, fullMatch, modelNumber, slug] = match;
    tags.push({
      "card-id": parseInt(modelNumber),
      "display-name": slugToDisplayName(slug),
      id: uuidv4(),
      name: fullMatch,
      type: "card"
    })
  }
  // convert to dictionary with name as key
  return Object.fromEntries(tags.map(tag => [tag.name, tag]))
}

export const getAllTemplateTagsInQuery = (query: string, allSnippets?: MetabaseStateSnippetsDict) => {
  const snippetTags = allSnippets ? getSnippetsInQuery(query, allSnippets) : {};
  const modelTags = getModelsInQuery(query);
  return { ...snippetTags, ...modelTags };
}