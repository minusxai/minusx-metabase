// import { replaceEntityPatternWithModelIdentifier } from "./catalogAsModels";
// exported for testing
const replaceEntityPatternWithModelIdentifier = (sql: string, entityName: string, modelIdentifier: string) => {
  // it will always be referred to by minusx.${entityName} or "minusx"."${entityName}"
  // should replace wither of these patterns with the full model identifier
  const pattern = new RegExp(`(?<!\\w)(minusx\\.${entityName})|("minusx"\\."${entityName}")(?!\\w)`, 'g');
  return sql.replace(pattern, modelIdentifier)
}
describe('replaceEntityPatternWithModelIdentifier', () => {
  it('should replace minusx.entityName with minusx#modelId-modelSlug', () => {
    const sql = `SELECT * FROM minusx.someEntity`
    const entityName = 'someEntity'
    const modelIdentifier = 'minusx#modelId-modelSlug'
    const expectedResult = `SELECT * FROM ${modelIdentifier}`
    expect(replaceEntityPatternWithModelIdentifier(sql, entityName, modelIdentifier)).toBe(expectedResult)
  })
  it('should replace "minusx"."entityName" with minusx#modelId-modelSlug', () => {
    const sql = `SELECT * FROM "minusx"."someEntity"`
    const entityName = 'someEntity'
    const modelIdentifier = 'minusx#modelId-modelSlug'
    const expectedResult = `SELECT * FROM ${modelIdentifier}`
    expect(replaceEntityPatternWithModelIdentifier(sql, entityName, modelIdentifier)).toBe(expectedResult)
  })
})