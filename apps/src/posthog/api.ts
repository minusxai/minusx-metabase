import { RPCs, memoize } from 'web'
import { get } from 'lodash'
import { getWithWarning } from '../common/utils'
import { DatabaseSchemaQueryResponse } from './types'

const DEFAULT_TTL = 0
// sample /api/projects response:
/*
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 81547,
      "uuid": "0190ed48-e824-0000-e672-18e73e032322",
      "organization": "0190ed48-e725-0000-74eb-63e5bc82b1bb",
      "api_token": "phc_raFEq4FnuETYCApJnezA6L4Fys2d2Ciq5sZ6mtAbGyW",
      "name": "MinusX",
      "completed_snippet_onboarding": false,
      "has_completed_onboarding_for": {
        "session_replay": true
      },
      "ingested_event": true,
      "is_demo": false,
      "timezone": "UTC",
      "access_control": false
    }
  ]
}
*/
interface ProjectsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: number;
  }[]
}

// api implementation, not using right now
const getProjectIdUsingApi = async () => {
  const response = await RPCs.fetchData('/api/projects', 'GET') as ProjectsResponse
  // TODO: figure out if there are multiple projects how to deal with it? lol
  if (response?.count == 1) {
    return getWithWarning(response, 'results[0].id', 0)
  } else if (response?.count > 1) {
    console.warn('Multiple projects found, using first one')
    return getWithWarning(response, 'results[0].id', 0)
  }
  throw new Error('No projects found')
}

const getCurrentProjectId = async () => {
  const projectId = await RPCs.getPosthogAppContext('current_team.id') as number
  if (projectId) {
    return projectId
  } else {
    throw new Error('No current project found')
  }
}

export const memoizedGetCurrentProjectId = memoize(getCurrentProjectId, DEFAULT_TTL)

const getDatabaseSchema = async (projectId: number) => {
  const response = await RPCs.fetchData(
    `/api/projects/${projectId}/query/`, 
    'POST', 
    {
      "query": {
        "kind": "DatabaseSchemaQuery"
      }
    },
    {},
    {cookieKey: 'posthog_csrftoken', headerKey: 'X-Csrftoken'}
  ) as DatabaseSchemaQueryResponse
  const extractedTables  = Object.values(response.tables)
  return extractedTables
}

// this is a subset
interface SqlQueryMetadataQueryResponse {
  errors: {
    start: number;
    end: number;
    message: string;
    fix: string | null;
  }[]
  isValid: boolean;
  isValidView: boolean;
}

export const getSqlQueryMetadata = async (sqlQuery: string) => {
  const projectId = await memoizedGetCurrentProjectId()
  if (projectId) {
    const response = await RPCs.fetchData(
      `/api/projects/${projectId}/query/`, 
      'POST', 
      {
        "query": {
          "kind": "HogQLMetadata",
          "language": "hogQL",
          "query": sqlQuery
        }
      },
      {},
      {cookieKey: 'posthog_csrftoken', headerKey: 'X-Csrftoken'}
    ) as SqlQueryMetadataQueryResponse
    return response
  } else {
    console.warn("No current project found")
  }
}

const getCurrentProjectDatabaseSchema = async () => {
  const projectId = await memoizedGetCurrentProjectId()
  if (projectId) {
    return getDatabaseSchema(projectId)
  } else {
    console.warn("No current project found")
    return []
  }
}

export const memoizedGetCurrentProjectDatabaseSchema = memoize(getCurrentProjectDatabaseSchema, DEFAULT_TTL)

// see sample-event-definitions-response.json
export interface PosthogEventDefinitionQueryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    name: string;
    created_at: string;
    last_seen_at: string;
    is_action: boolean;
    post_to_slack: boolean;
    tags: string[];
  }[]
}

/*export*/ const getPosthogEventDefinitions = async () => {
  const projectId = await memoizedGetCurrentProjectId()
  if (projectId) {
    const response = await RPCs.fetchData(
      `/api/projects/${projectId}/event_definitions?limit=50&event_type=event_posthog&ordering=name&search=`, 
      'GET', 
      undefined,
      {cookieKey: 'posthog_csrftoken', headerKey: 'X-Csrftoken'}
    ) as PosthogEventDefinitionQueryResponse
    return response
  } else {
    console.warn("No current project found")
  }
}

export const memoizedGetPosthogEventDefinitions = memoize(getPosthogEventDefinitions, DEFAULT_TTL)


const excluded_properties = ["distinct_id","$session_duration","$copy_type","$selected_content","$set","$set_once","$pageview_id","$autocapture_disabled_server_side","$console_log_recording_enabled_server_side","$session_recording_recorder_version_server_side","$feature_flag_payloads","$capture_failed_request","$sentry_exception","$sentry_exception_message","$sentry_exception_type","$sentry_tags","$exception_type","$exception_message","$exception_source","$exception_lineno","$exception_colno","$exception_DOMException_code","$exception_is_synthetic","$exception_stack_trace_raw","$exception_handled","$exception_personURL","$ce_version","$anon_distinct_id","$event_type","$insert_id","$time","$device_id","$geoip_city_name","$geoip_country_name","$geoip_country_code","$geoip_continent_name","$geoip_continent_code","$geoip_postal_code","$geoip_latitude","$geoip_longitude","$geoip_time_zone","$geoip_subdivision_1_name","$geoip_subdivision_1_code","$geoip_subdivision_2_name","$geoip_subdivision_2_code","$geoip_subdivision_3_name","$geoip_subdivision_3_code","$geoip_disable","$el_text","$app_build","$app_name","$app_namespace","$app_version","$device_manufacturer","$is_emulator","$device_name","$locale","$os_name","$os_version","$timezone","$touch_x","$touch_y","$plugins_succeeded","$groups","$group_0","$group_1","$group_2","$group_3","$group_4","$group_set","$group_key","$group_type","$window_id","$session_id","$plugins_failed","$plugins_deferred","$$plugin_metrics","$creator_event_uuid","utm_source","$initial_utm_source","utm_medium","utm_campaign","utm_name","utm_content","utm_term","$performance_page_loaded","$performance_raw","$had_persisted_distinct_id","$sentry_event_id","$timestamp","$sent_at","$browser","$os","$browser_language","$current_url","$browser_version","$raw_user_agent","$user_agent","$screen_height","$screen_width","$screen_name","$viewport_height","$viewport_width","$lib","$lib_custom_api_host","$lib_version","$lib_version__major","$lib_version__minor","$lib_version__patch","$referrer","$referring_domain","$user_id","$ip","$host","$pathname","$search_engine","$active_feature_flags","$enabled_feature_flags","$feature_flag_response","$feature_flag","$survey_response","$survey_name","$survey_questions","$survey_id","$survey_iteration","$survey_iteration_start_date","$device","$sentry_url","$device_type","$screen_density","$device_model","$network_wifi","$network_bluetooth","$network_cellular","$client_session_initial_referring_host","$client_session_initial_pathname","$client_session_initial_utm_source","$client_session_initial_utm_campaign","$client_session_initial_utm_medium","$client_session_initial_utm_content","$client_session_initial_utm_term","$network_carrier","from_background","url","referring_application","version","previous_version","build","previous_build","gclid","rdt_cid","gad_source","gclsrc","dclid","gbraid","wbraid","fbclid","msclkid","twclid","li_fat_id","mc_cid","igshid","ttclid","$is_identified","$web_vitals_enabled_server_side","$web_vitals_FCP_event","$web_vitals_FCP_value","$web_vitals_LCP_event","$web_vitals_LCP_value","$web_vitals_INP_event","$web_vitals_INP_value","$web_vitals_CLS_event","$web_vitals_CLS_value"]

export interface CommonPropertiesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: {
    id: string;
    name: string;
    is_numerical: boolean;
    property_type: string;
    is_seen_on_filtered_events: boolean;
    tags: string[];
  }
}

export const getEventCommonProperties = async (eventNames: string[]) => {
  const projectId = await memoizedGetCurrentProjectId()
  if (projectId) {
    // a very shitty url but whatever
    const commonPropertiesUrl = `/api/projects/${projectId}/property_definitions?limit=5&event_names=${JSON.stringify(eventNames.join(','))}&excluded_properties=${JSON.stringify(excluded_properties.join(','))}&is_feature_flag=false `
    const response = await RPCs.fetchData(
      commonPropertiesUrl,
      'GET', 
      undefined,
      {cookieKey: 'posthog_csrftoken', headerKey: 'X-Csrftoken'}
    ) as CommonPropertiesResponse
    return response
  } else {
    console.warn("No current project found")
    return []
  }
}