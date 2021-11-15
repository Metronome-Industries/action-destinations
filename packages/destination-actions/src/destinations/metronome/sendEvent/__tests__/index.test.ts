import nock from 'nock'
import { createTestEvent, createTestIntegration } from '@segment/actions-core'
import Destination from '../../index'

const testDestination = createTestIntegration(Destination)

describe('Metronome.sendEvent', () => {
  describe("process", () => {
    it('should send an event', async () => {
      const event = createTestEvent();

      nock('https://api.getmetronome.com').post('/v1/ingest').reply(200)

      const responses = await testDestination.testAction('sendEvent', {
        event,
        useDefaultMappings: true,
        settings: {
          apiToken: "mock-api-token",
        },
        mapping: {
          event_type: { '@path': "$.event" },
          properties: { '@path': "$.context" },
        },
      });

      expect(responses.length).toBe(1)
      expect(responses[0].status).toBe(200)

      // TODO: Feels like there should be a lighter weight to do this check
      expect(responses[0].options.headers).toMatchInlineSnapshot(`
        Headers {
          Symbol(map): Object {
            "authorization": Array [
              "Bearer mock-api-token",
            ],
            "user-agent": Array [
              "Segment (Actions)",
            ],
          },
        }
      `)

      expect(responses[0].options.json).toEqual([
        {
          event_type: event.event,
          customer_id: event.groupId || event.userId || event.anonymousId,
          properties: event.context,
          transaction_id: event.messageId,
          timestamp: new Date(event.timestamp ?? "").toISOString(),
        }
      ])
    })


    it('should convert a non rfc3999 timestamp', async () => {
      const event = createTestEvent({
        timestamp: "2021-01-01"
      });

      nock('https://api.getmetronome.com').post('/v1/ingest').reply(200)

      const responses = await testDestination.testAction('sendEvent', {
        event,
        useDefaultMappings: true,
        settings: {
          apiToken: "mock-api-token",
        },
        mapping: {
          event_type: { '@path': "$.event" },
          properties: { '@path': "$.context" },
        },
      });

      expect(responses.length).toBe(1)
      expect(responses[0].status).toBe(200)

      // TODO: Feels like there should be a lighter weight to do this check
      expect(responses[0].options.headers).toMatchInlineSnapshot(`
        Headers {
          Symbol(map): Object {
            "authorization": Array [
              "Bearer mock-api-token",
            ],
            "user-agent": Array [
              "Segment (Actions)",
            ],
          },
        }
      `)
      expect(responses[0].options.json).toEqual([
        {
          event_type: event.event,
          customer_id: event.groupId || event.userId || event.anonymousId,
          properties: event.context,
          transaction_id: event.messageId,
          timestamp: new Date(event.timestamp ?? "").toISOString(),
        }
      ])
    })
  })

  describe("processBatch", () => {
    // TODO: depending on the todo about ensuring we only send 1<=x<=100 events, we may need to add more tests here
    it('should send an event', async () => {

      // create an array of 50 mock events with a variety of timestamp formats
      const events = Array.from({ length: 50 }, (_, i) => {
        const now = new Date();
        if (i % 3 == 0) {
          return createTestEvent({
            timestamp: now.toISOString(),
          });
        } else if (i % 5 == 0) {
          return createTestEvent({
            timestamp: `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
          });
        } else {
          return createTestEvent();
        }
      })



      nock('https://api.getmetronome.com').post('/v1/ingest').reply(200)

      const responses = await testDestination.testBatchAction('sendEvent', {
        events,
        useDefaultMappings: true,
        settings: {
          apiToken: "mock-api-token",
        },
        mapping: {
          event_type: { '@path': "$.event" },
          properties: { '@path': "$.context" },
        },
      });

      expect(responses.length).toBe(1)
      expect(responses[0].status).toBe(200)

      // TODO: Feels like there should be a lighter weight to do this check
      expect(responses[0].options.headers).toMatchInlineSnapshot(`
          Headers {
            Symbol(map): Object {
              "authorization": Array [
                "Bearer mock-api-token",
              ],
              "user-agent": Array [
                "Segment (Actions)",
              ],
            },
          }
        `)

      expect(responses[0].options.json).toEqual(events.map(event => ({
        event_type: event.event,
        customer_id: event.groupId || event.userId || event.anonymousId,
        properties: event.context,
        transaction_id: event.messageId,
        timestamp: new Date(event.timestamp ?? "").toISOString(),
      })))
    })
  })
})
