/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import trRoutingServiceBackend from '../../../utils/trRouting/TrRoutingServiceBackend';
import transitRoutingService from '../TransitRoutingService';
import { TransitRouteQueryOptions } from 'chaire-lib-common/lib/api/TrRouting';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { TestUtils } from 'chaire-lib-common/lib/test';
import { pathNoTransferRouteV2 } from 'chaire-lib-common/lib/test/services/transitRouting/TrRoutingConstantsStubs';
import { ErrorCodes } from 'chaire-lib-common/lib/services/transitRouting/types';

const origin = TestUtils.makePoint([-73.745618, 45.368994]);
const destination = TestUtils.makePoint([-73.742861, 45.361682]);

jest.mock('../../../utils/trRouting/TrRoutingServiceBackend', () => ({
    route: jest.fn(),
    batchRoute: jest.fn(),
    summary: jest.fn(),
    accessibilityMap: jest.fn()
}));
const mockRouteBackend = trRoutingServiceBackend.route as jest.MockedFunction<typeof trRoutingServiceBackend.route>;
const mockBatchRouteBackend = trRoutingServiceBackend.batchRoute as jest.MockedFunction<typeof trRoutingServiceBackend.batchRoute>;
const mockSummaryBackend = trRoutingServiceBackend.summary as jest.MockedFunction<typeof trRoutingServiceBackend.summary>;
const mockAccessibilityMapBackend = trRoutingServiceBackend.accessibilityMap as jest.MockedFunction<typeof trRoutingServiceBackend.accessibilityMap>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('Test accessibility map calls', () => {
    
    test('With origin', async () => {
        const parameters = {
            minWaitingTime: 180,
            maxAccessTravelTime: 900,
            maxEgressTravelTime: 900,
            maxTransferTravelTime: 900,
            maxTravelTime: 900,
            scenarioId: 'abcdef',
            location: origin,
            timeOfTrip: 10800,
            timeOfTripType: 'departure' as const
        };
        const nodes = [{
            nodeName: 'TestNode',
            nodeCode: 'T',
            nodeUuid: 'arbitrary',
            nodeTime: 11800,
            nodeCoordinates: origin.geometry.coordinates as [number, number],
            totalTravelTime: 900,
            numberOfTransfers: 1
        }];
        // Test only an origin and departure time, the alternative should not be set and all_nodes=1 should be there
        mockAccessibilityMapBackend.mockResolvedValueOnce({
            status: 'success', 
            query: {
                place: origin.geometry.coordinates as [number, number],
                timeType: 0,
                timeOfTrip: 10800
            },
            result: {
                nodes,
                totalNodeCount: 10
            }
        });
        const result = await transitRoutingService.accessibleMap(parameters);
        expect(mockAccessibilityMapBackend).toHaveBeenCalledTimes(1);
        expect(mockAccessibilityMapBackend).toHaveBeenLastCalledWith(parameters, undefined);
        expect(result).toEqual({ type: 'nodes', nodes: [{ 
            arrivalTimeSeconds: nodes[0].nodeTime,
            arrivalTime: undefined,
            departureTime: undefined,
            departureTimeSeconds: undefined,
            numberOfTransfers: nodes[0].numberOfTransfers,
            id: nodes[0].nodeUuid,
            totalTravelTimeSeconds: nodes[0].totalTravelTime
        }] });

    });
    
    test('With destination and options', async () => {
        const parameters = {
            minWaitingTime: 180,
            maxAccessTravelTime: 900,
            maxEgressTravelTime: 900,
            maxTransferTravelTime: 900,
            maxTravelTime: 900,
            scenarioId: 'abcdef',
            location: origin,
            timeOfTrip: 10800,
            timeOfTripType: 'arrival' as const
        };
        const nodes = [{
            nodeName: 'TestNode',
            nodeCode: 'T',
            nodeUuid: 'arbitrary',
            nodeTime: 11800,
            nodeCoordinates: origin.geometry.coordinates as [number, number],
            totalTravelTime: 900,
            numberOfTransfers: 1
        }];
        // Test only an origin and departure time, the alternative should not be set and all_nodes=1 should be there
        mockAccessibilityMapBackend.mockResolvedValueOnce({
            status: 'success', 
            query: {
                place: origin.geometry.coordinates as [number, number],
                timeType: 1,
                timeOfTrip: 10800
            },
            result: {
                nodes,
                totalNodeCount: 10
            }
        });
        const options = { hostPort: { host: 'http://test', port: 1234 } }
        const result = await transitRoutingService.accessibleMap(parameters, options);
        expect(mockAccessibilityMapBackend).toHaveBeenCalledTimes(1);
        expect(mockAccessibilityMapBackend).toHaveBeenLastCalledWith(parameters, options.hostPort);
        expect(result).toEqual({ type: 'nodes', nodes: [{ 
            arrivalTimeSeconds: undefined,
            arrivalTime: undefined,
            departureTime: undefined,
            departureTimeSeconds: nodes[0].nodeTime,
            numberOfTransfers: nodes[0].numberOfTransfers,
            id: nodes[0].nodeUuid,
            totalTravelTimeSeconds: nodes[0].totalTravelTime
        }] });

    });

    test('Rejected response', async () => {
        const parameters = {
            minWaitingTime: 180,
            maxAccessTravelTime: 900,
            maxEgressTravelTime: 900,
            maxTransferTravelTime: 900,
            maxTravelTime: 900,
            scenarioId: 'abcdef',
            location: origin,
            timeOfTrip: 10800,
            timeOfTripType: 'departure' as const
        };
        mockAccessibilityMapBackend.mockRejectedValueOnce(new Error('Accessibility map error'));
        let exception;
        try {
            await transitRoutingService.accessibleMap(parameters);
        } catch (error) {
            exception = error;
        }
        expect(exception).not.toBeUndefined();
        expect(exception instanceof TrError).toBeTruthy();
        const exceptionObject = (exception as TrError).export();
        expect(exceptionObject.error).toEqual('cannot handle call to trRouting: Error: Accessibility map error');
        expect(exceptionObject.errorCode).toEqual(ErrorCodes.OtherError);
        expect((exceptionObject.localizedMessage as any).text).toContain('TrRoutingServerError');
        expect(mockAccessibilityMapBackend).toHaveBeenCalledTimes(1);
        expect(mockAccessibilityMapBackend).toHaveBeenLastCalledWith(parameters, undefined);
    });

});

describe('Test route call', () => {
    const parameters: TransitRouteQueryOptions = {
        minWaitingTime: 180,
        maxAccessTravelTime: 900,
        maxEgressTravelTime: 900,
        maxTransferTravelTime: 900,
        maxTravelTime: 900,
        alternatives: true,
        scenarioId: 'abcdef',
        originDestination: [origin, destination],
        timeOfTrip: 10800,
        timeOfTripType: 'departure'  
    };

    const defaultSuccessfulQuery = {
        status: 'success' as const, 
        query: {
            origin: origin.geometry.coordinates as [number, number],
            destination: destination.geometry.coordinates as [number, number],
            timeType: 0 as const,
            timeOfTrip: 10800
        },
        result: {
            routes: [pathNoTransferRouteV2],
            totalRoutesCalculated: 1
        }
    }

    const defaultQueryToResult = {
        originDestination: [TestUtils.makePoint(defaultSuccessfulQuery.query.origin as any), TestUtils.makePoint(defaultSuccessfulQuery.query.destination as any)],
        timeOfTripType: 'departure' as const,
        timeOfTrip: defaultSuccessfulQuery.query.timeOfTrip
    }

    test('Test successful response', async () => {

        mockRouteBackend.mockResolvedValueOnce(defaultSuccessfulQuery);
        const result = await transitRoutingService.route(parameters);
        expect(mockRouteBackend).toHaveBeenCalledTimes(1);
        expect(mockRouteBackend).toHaveBeenLastCalledWith(parameters, undefined);
        expect(result).toEqual({ routes: [{ ...pathNoTransferRouteV2, ...defaultQueryToResult }], totalRoutesCalculated: 1 });
    });

    test('Test call with host port', async () => {
        const hostPort = {
            host: 'http://test',
            port: 1234
        };

        mockRouteBackend.mockResolvedValueOnce(defaultSuccessfulQuery);
        const result = await transitRoutingService.route(parameters, hostPort);
        expect(mockRouteBackend).toHaveBeenCalledTimes(1);
        expect(mockRouteBackend).toHaveBeenLastCalledWith(parameters, hostPort);
        expect(result).toEqual({ routes: [{ ...pathNoTransferRouteV2, ...defaultQueryToResult }], totalRoutesCalculated: 1 });
    });
    
    test('Test erroneous response', async () => {
        mockRouteBackend.mockResolvedValueOnce({status: 'no_routing_found', query: defaultSuccessfulQuery.query });
        let exception;
        try {
            const result = await transitRoutingService.route(parameters);
        } catch (error) {
            exception = error;
        }
        expect(exception).not.toBeUndefined();
        expect(exception instanceof TrError).toBeTruthy();
        const exceptionObject = (exception as TrError).export();
        expect(exceptionObject.error).toEqual('cannot calculate transit route with trRouting: no_routing_found');
        expect(exceptionObject.errorCode).toEqual(ErrorCodes.NoRoutingFound);
        expect(exceptionObject.localizedMessage).toContain('NoResultFound');
        expect(mockRouteBackend).toHaveBeenCalledTimes(1);
        expect(mockRouteBackend).toHaveBeenLastCalledWith(parameters, undefined);
    
    });
    
    test('Test erroneous response with a reason', async () => {
        mockRouteBackend.mockResolvedValueOnce({
            status: 'no_routing_found',
            query: defaultSuccessfulQuery.query,
            reason: 'NO_ACCESS_AT_ORIGIN'
        });
        let exception;
        try {
            const result = await transitRoutingService.route(parameters);
        } catch (error) {
            exception = error;
        }
        expect(exception).not.toBeUndefined();
        expect(exception instanceof TrError).toBeTruthy();
        const exceptionObject = (exception as TrError).export();
        expect(exceptionObject.error).toEqual('cannot calculate transit route with trRouting: no_routing_found');
        expect(exceptionObject.errorCode).toEqual(ErrorCodes.NoAccessAtOrigin);
        expect(exceptionObject.localizedMessage).toContain('NO_ACCESS_AT_ORIGIN');
        expect(mockRouteBackend).toHaveBeenCalledTimes(1);
        expect(mockRouteBackend).toHaveBeenLastCalledWith(parameters, undefined);
    });
    
    test('Test reject route value', async () => {
        mockRouteBackend.mockRejectedValueOnce(new Error('Route error'));
        let exception;
        try {
            await transitRoutingService.route(parameters);
        } catch (error) {
            exception = error;
        }
        expect(exception).not.toBeUndefined();
        expect(exception instanceof TrError).toBeTruthy();
        const exceptionObject = (exception as TrError).export();
        expect(exceptionObject.error).toEqual('cannot handle call to trRouting: Error: Route error');
        expect(exceptionObject.errorCode).toEqual(ErrorCodes.OtherError);
        expect((exceptionObject.localizedMessage as any).text).toContain('TrRoutingServerError');
        expect(mockRouteBackend).toHaveBeenCalledTimes(1);
        expect(mockRouteBackend).toHaveBeenLastCalledWith(parameters, undefined);
    });

    test('Test batch route, with the result or error of each query', async () => {
        const hostPort = { port: 1234 };
        mockBatchRouteBackend.mockResolvedValueOnce({
            results: [
                defaultSuccessfulQuery,
                { status: 'no_routing_found', query: defaultSuccessfulQuery.query, reason: 'NO_ACCESS_AT_ORIGIN' }
            ]
        });
        const results = await transitRoutingService.batchRoute([parameters, parameters], hostPort);
        expect(mockBatchRouteBackend).toHaveBeenCalledTimes(1);
        expect(mockBatchRouteBackend).toHaveBeenLastCalledWith([parameters, parameters], hostPort);
        expect(results.length).toEqual(2);
        expect(results[0]).toEqual({ routes: [{ ...pathNoTransferRouteV2, ...defaultQueryToResult }], totalRoutesCalculated: 1 });
        expect(results[1] instanceof TrError).toBeTruthy();
        expect((results[1] as TrError).export().errorCode).toEqual(ErrorCodes.NoAccessAtOrigin);
    });

    test.each([
        ['data error', () => Promise.resolve({ status: 'data_error' as const, errorCode: 'MISSING_DATA_NODES' as const }), ErrorCodes.MissingData],
        ['rejected request', () => Promise.reject(new Error('Route error')), ErrorCodes.OtherError]
    ])('Test batch route with a %s', async (_title, response, errorCode) => {
        mockBatchRouteBackend.mockImplementationOnce(response as any);
        let exception;
        try {
            await transitRoutingService.batchRoute([parameters]);
        } catch (error) {
            exception = error;
        }
        expect(exception instanceof TrError).toBeTruthy();
        expect((exception as TrError).export().errorCode).toEqual(errorCode);
    });
});

describe('Test summary query', () => {
    const params = {
        originDestination: [origin, destination] as any,
        minWaitingTime: 180,
        maxAccessTravelTime: 900,
        maxEgressTravelTime: 900,
        maxTransferTravelTime: 900,
        maxTravelTime: 900,
        alternatives: true,
        scenarioId: 'abcdef',
        timeOfTrip: 10800,
        timeOfTripType: 'arrival' as const
    };

    test('Successful response', async () => {

        const response = { 
            status: 'success' as const, 
            query: {
                origin: origin.geometry.coordinates as [number, number],
                destination: destination.geometry.coordinates as [number, number],
                timeType: 0 as const,
                timeOfTrip: 10800   
            },
            result: {
                nbRoutes: 1, 
                lines: [{
                    lineUuid: 'lineUuid',
                    lineShortname: 'shortname',
                    lineLongname: 'longname',
                    agencyUuid: 'agencyUuid',
                    agencyAcronym: 'acro',
                    agencyName: 'agencyName',
                    alternativeCount: 2
                }]
            }
        };
        mockSummaryBackend.mockResolvedValueOnce(response);
        
        const result = await transitRoutingService.summary(params);
        expect(result).toEqual(response);
        expect(mockSummaryBackend).toHaveBeenCalledTimes(1);
        expect(mockSummaryBackend).toHaveBeenLastCalledWith(params);
    });

    test('Rejected response', async () => {
        mockSummaryBackend.mockRejectedValueOnce(new Error('Summary error'));
        let exception;
        try {
            const result = await transitRoutingService.summary(params);
        } catch (error) {
            exception = error;
        }
        expect(exception).not.toBeUndefined();
        expect(exception instanceof TrError).toBeTruthy();
        const exceptionObject = (exception as TrError).export();
        expect(exceptionObject.error).toEqual('cannot handle call to trRouting: Error: Summary error');
        expect(exceptionObject.errorCode).toEqual(ErrorCodes.OtherError);
        expect((exceptionObject.localizedMessage as any).text).toContain('TrRoutingServerError');
        expect(mockSummaryBackend).toHaveBeenCalledTimes(1);
        expect(mockSummaryBackend).toHaveBeenLastCalledWith(params);
    });
});
