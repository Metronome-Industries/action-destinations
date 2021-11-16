import type { ActionDefinition } from '@segment/actions-core'
import type { Settings } from '../generated-types'
import type { Payload } from './generated-types'

function serializeEvent(event: Payload) {
  // convert the timestamp into rfc3999
  // TODO: we may want to enforce/drop non scalar property values here.
  return {
    ...event,
    timestamp: new Date(event.timestamp).toISOString(),
  }
}

const action: ActionDefinition<Settings, Payload> = {
  title: 'Send Event',
  description: 'Send an event to Metronome',
  fields: {
    transaction_id: {
      type: 'string',
      label: 'transaction_id',
      description: 'The Metronome transaction ID uniquely identifies an event to ensure Metronome only processes each event once.',
      required: true,
      default: {
        '@path': '$.messageId'
      }
    },
    customer_id: {
      type: 'string',
      label: 'customer_id',
      description: 'The Metronome customer ID or ingest alias this event should be associated with.',
      required: true,
      default: {
        // By default, use the group ID if it exists, otherwise use the customer ID. If neither exist, use the anonymous ID.
        '@if': {
          exists: { '@path': '$.groupId' },
          then: { '@path': '$.groupId' },
          else: {
            '@if': {
              exists: { '@path': '$.userId' },
              then: { '@path': '$.userId' },
              else: { '@path': '$.anonymousId' }
            }
          }
        }
      }
    },
    timestamp: {
      type: 'datetime',
      label: 'timestamp',
      description: 'The timestamp at which this event occurred.',
      required: true,
      default: {
        '@path': '$.timestamp'
      }
    },
    event_type: {
      type: 'string',
      label: 'event_type',
      description: 'The Metronome event_type.',
      required: true,
    },
    properties: {
      type: 'object',
      label: 'properties',
      description: 'The Metronome properties object.',
      required: true,
    },
  },
  perform: (request, { payload }) => {
    // Auth is injected by extendRequest in the destination root
    return request('https://api.getmetronome.com/v1/ingest', {
      method: 'post',
      json: [
        serializeEvent(payload)
      ]
    })
  },
  performBatch: (request, { payload }) => {
    // Segment says:
    //   "The batch size for action destinations is currently hardcoded at <= 50 events.
    //   We don’t have plans to change this but we could do so in the future  (we’d work with you to
    //   ensure we don’t go over that 100+ limit without preparation on both Segment’s and Metronome’s end)"
    // As such we don't need to worry about sending too many events here.

    // Auth is injected by extendRequest in the destination root
    return request('https://api.getmetronome.com/v1/ingest', {
      method: 'post',
      json: payload.map(serializeEvent)
    })
  },
}

export default action
