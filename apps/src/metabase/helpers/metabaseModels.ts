import { fetchModelInfo } from "./metabaseAPI";
import { FormattedTable, MetabaseModel } from "./metabaseAPITypes";
import { groupBy } from "lodash";
import slugg from "slugg";

type ModelsQueryResponse = {
    tables: MetabaseTable[];
};
  
type MetabaseTable = {
    id: string;
    db_id: number;
    schema: string;
    description: string | null;
    display_name: string;
    type: string;
    fields: MetabaseModelField[];
};

type MetabaseModelField = {
    id: FieldRef;
    field_ref: FieldRef;
    name: string;
    display_name: string;
    table_id: string;
    database_type: string;
    semantic_type: string | null;
    base_type: string;
};

export type FieldRef = [type: string, name: string, meta: { 'base-type': string } | null];


const fieldRefToId = (modelId: number, fieldRef: FieldRef): string => {
    return `${modelId}-${fieldRef[1]}-${fieldRef[2]?.['base-type'] || ''}`;
}

const metabaseModelToLLMFriendlyIdentifier = (model: MetabaseModel): {schema: string, table: string} => {
    return {
        schema: 'mm_' + slugg(model.collectionName || 'default_collection', {separator: '_'}),
        table: slugg(model.name, {separator: '_'})
    };
}

// have to use default slugg implementation to match metabase's format
const getModelIdentifier = (model: MetabaseModel): string => {
    return "#" + model.modelId + '-' + slugg(model.name)
}

const replaceLLMFriendlyIdentifierWithModelIdentifier = (sql: string, model: MetabaseModel) => {
    const {schema, table} = metabaseModelToLLMFriendlyIdentifier(model);
    // it will always be referred to by mm_${collection_name}.${model} or "mm_${collection_name}"."${model}"
    // should replace wither of these patterns with the full model identifier
    const pattern = new RegExp(`(?<!\\w)(${schema}\\.${table})|("${schema}"\\."${table}")|(\`${schema}\\.${table}\`)(?!\\w)`, 'g');
    return sql.replace(pattern, "{{" + getModelIdentifier(model) + "}}")
}

export const replaceLLMFriendlyIdentifiersInSqlWithModels = (sql: string, selectedModels: MetabaseModel[]) => {
    for (const model of selectedModels) {
        sql = replaceLLMFriendlyIdentifierWithModelIdentifier(sql, model)
    }
    return sql
}

// replace {{#modelId-slug}} with mm_${collection_name}.${model} or "mm_${collection_name}"."${model}"
export const modifySqlForMetabaseModels = (sql: string, models: MetabaseModel[]) => {
    for (const model of models) {
        const modelIdentifier = getModelIdentifier(model);
        const {schema, table} = metabaseModelToLLMFriendlyIdentifier(model);
        sql = sql.replace(new RegExp(`{{\\s*${modelIdentifier}\\s*}}`, 'g'), `"${schema}"."${table}"`)
    }
    return sql
}


const getModelData = async (model: MetabaseModel): Promise<FormattedTable> => {
    const modelInfo = await fetchModelInfo({model_id: model.modelId}) as ModelsQueryResponse;
    const schemaAndTable = metabaseModelToLLMFriendlyIdentifier(model);
    // take the last table
    const table = modelInfo.tables[modelInfo.tables.length - 1];
    const fieldArray = table.fields.map(field => {
        return {
            name: field.name,
            id: fieldRefToId(model.modelId, field.field_ref),
            type: field.base_type,
        }
    })
    const columns = Object.fromEntries(fieldArray.map(field => [field.id, field]));
    return {
        name: schemaAndTable.table,
        id: model.modelId,
        schema: schemaAndTable.schema,
        columns
    };
}
  

export const getModelsWithFields = async (models: MetabaseModel[]) => {
    const promises = models.map(model => getModelData(model));
    const modelInfos = await Promise.all(promises);
    return modelInfos;
}