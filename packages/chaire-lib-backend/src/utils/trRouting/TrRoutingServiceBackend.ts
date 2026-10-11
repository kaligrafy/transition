/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import ServerConfig from '../../config/ServerConfig';
import * as TrRoutingApi from 'chaire-lib-common/lib/api/TrRouting';

/**
 * A class that wraps the calls to the trRouting service API
 *
 * TODO: Make an instance of this class per host/port, with url prefix defined
 * at construction. Port management should be done by the
 * TrRoutingProcessManager
 *
 * @class TrRoutingServiceBackend
 */
class TrRoutingServiceBackend {
    private async request<T>(
        query: string,
        host: string | undefined,
        port: string | number | undefined,
        customRequestPath: string,
        body?: unknown
    ): Promise<T> {
        // Requests with a body are POST requests with a JSON body, without query string
        const trRoutingRequest =
            body === undefined
                ? `${this.getUrlPrefix(host, port, customRequestPath)}?${query}`
                : this.getUrlPrefix(host, port, customRequestPath);
        const requestInit: RequestInit =
            body === undefined
                ? { method: 'GET' }
                : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };

        const maxAttempts = 2;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(trRoutingRequest, requestInit);
                // 200 and 400 are both valid response from TrRouting and are handled by the parsers
                if (![200, 400].includes(response.status)) {
                    throw new Error(`TrRouting request failed with status ${response.status}`);
                }
                return await response.json();
            } catch (error) {
                console.error(`TrRouting Fetch error (try ${i}): ${error}`);
                // Wait 1s until next attempt
                await new Promise((r) => setTimeout(r, 1000));
            }
        }
        console.error('TrRouting Request exhausted all retries');
        throw new Error('TrRouting request failed, exhausted all retries');
    }

    // FIXME This call is still necessary for od trips and all_nodes, until all calls have been updated to API v2
    v1TransitCall(
        query: string,
        host: string,
        port: string
    ): Promise<
        | TrRoutingApi.TrRoutingWithAlternativeResult
        | TrRoutingApi.TrRoutingPath
        | TrRoutingApi.TrRoutingNoResult
        | TrRoutingApi.TrRoutingErrorWithCode
        | TrRoutingApi.TrRoutingError
        | TrRoutingApi.TrRoutingAccessibleMap
    > {
        return this.request<
            | TrRoutingApi.TrRoutingWithAlternativeResult
            | TrRoutingApi.TrRoutingPath
            | TrRoutingApi.TrRoutingNoResult
            | TrRoutingApi.TrRoutingErrorWithCode
            | TrRoutingApi.TrRoutingError
            | TrRoutingApi.TrRoutingAccessibleMap
        >(query, host, port, 'route/v1/transit');
    }

    // The parameters of /v2/route, in the order of the query string
    private routeOptionsToParameters = (
        parameters: TrRoutingApi.TransitRouteQueryOptions
    ): { [name: string]: string | number } => {
        const trRoutingParameters: { [name: string]: string | number } = {
            origin: `${parameters.originDestination[0].geometry.coordinates[0]},${parameters.originDestination[0].geometry.coordinates[1]}`,
            destination: `${parameters.originDestination[1].geometry.coordinates[0]},${parameters.originDestination[1].geometry.coordinates[1]}`,
            scenario_id: parameters.scenarioId,
            time_of_trip: parameters.timeOfTrip,
            time_type: parameters.timeOfTripType === 'departure' ? 0 : 1,
            alternatives: parameters.alternatives !== true ? 'false' : 'true'
        };

        if (parameters.minWaitingTime) {
            trRoutingParameters.min_waiting_time = parameters.minWaitingTime;
        }
        if (parameters.maxAccessTravelTime) {
            trRoutingParameters.max_access_travel_time = parameters.maxAccessTravelTime;
        }
        if (parameters.maxEgressTravelTime) {
            trRoutingParameters.max_egress_travel_time = parameters.maxEgressTravelTime;
        }
        if (parameters.maxTransferTravelTime) {
            trRoutingParameters.max_transfer_travel_time = parameters.maxTransferTravelTime;
        }
        if (parameters.maxTravelTime) {
            trRoutingParameters.max_travel_time = parameters.maxTravelTime;
        }
        if (parameters.maxFirstWaitingTime) {
            trRoutingParameters.max_first_waiting_time = parameters.maxFirstWaitingTime;
        }

        return trRoutingParameters;
    };

    private routeOptionsToQueryString = (parameters: TrRoutingApi.TransitRouteQueryOptions): string =>
        Object.entries(this.routeOptionsToParameters(parameters))
            .map(([name, value]) => `${name}=${value}`)
            .join('&');

    private accessMapOptionsToQueryString = (parameters: TrRoutingApi.AccessibilityMapQueryOptions): string => {
        const trRoutingQueryArray = [
            `place=${parameters.location.geometry.coordinates[0]},${parameters.location.geometry.coordinates[1]}`,
            `scenario_id=${parameters.scenarioId}`,
            `time_of_trip=${parameters.timeOfTrip}`,
            `time_type=${parameters.timeOfTripType === 'departure' ? 0 : 1}`
        ];

        if (parameters.minWaitingTime) {
            trRoutingQueryArray.push(`min_waiting_time=${parameters.minWaitingTime}`);
        }
        if (parameters.maxAccessTravelTime) {
            trRoutingQueryArray.push(`max_access_travel_time=${parameters.maxAccessTravelTime}`);
        }
        if (parameters.maxEgressTravelTime) {
            trRoutingQueryArray.push(`max_egress_travel_time=${parameters.maxEgressTravelTime}`);
        }
        if (parameters.maxTransferTravelTime) {
            trRoutingQueryArray.push(`max_transfer_travel_time=${parameters.maxTransferTravelTime}`);
        }
        if (parameters.maxTravelTime) {
            trRoutingQueryArray.push(`max_travel_time=${parameters.maxTravelTime}`);
        }
        if (parameters.maxFirstWaitingTime) {
            trRoutingQueryArray.push(`max_first_waiting_time=${parameters.maxFirstWaitingTime}`);
        }

        return trRoutingQueryArray.join('&');
    };

    route(
        parameters: TrRoutingApi.TransitRouteQueryOptions,
        hostPort: TrRoutingApi.HostPort = {}
    ): Promise<TrRoutingApi.TrRoutingV2.RouteResponse> {
        const trRoutingQuery = this.routeOptionsToQueryString(parameters);

        return this.request<TrRoutingApi.TrRoutingV2.RouteResponse>(
            trRoutingQuery,
            hostPort.host,
            hostPort.port,
            'v2/route'
        );
    }

    /**
     * Calculate the transit routes of many queries in one request to
     * /v2/batchRoute, which is much faster than one route request per query
     *
     * @param parameters The parameters of each query
     * @param hostPort The host and port of the trRouting server
     * @returns The /v2/route response of each query, in the same order
     */
    batchRoute(
        parameters: TrRoutingApi.TransitRouteQueryOptions[],
        hostPort: TrRoutingApi.HostPort = {}
    ): Promise<TrRoutingApi.TrRoutingV2.BatchRouteResponse> {
        return this.request<TrRoutingApi.TrRoutingV2.BatchRouteResponse>(
            '',
            hostPort.host,
            hostPort.port,
            'v2/batchRoute',
            { queries: parameters.map(this.routeOptionsToParameters) }
        );
    }

    summary(parameters: TrRoutingApi.TransitRouteQueryOptions): Promise<TrRoutingApi.TrRoutingV2.SummaryResponse> {
        const trRoutingQuery = this.routeOptionsToQueryString(parameters);

        return this.request<TrRoutingApi.TrRoutingV2.SummaryResponse>(
            trRoutingQuery,
            undefined,
            undefined,
            'v2/summary'
        );
    }

    accessibilityMap(
        parameters: TrRoutingApi.AccessibilityMapQueryOptions,
        hostPort: TrRoutingApi.HostPort = {}
    ): Promise<TrRoutingApi.TrRoutingV2.AccessibilityMapResponse> {
        const trRoutingQuery = this.accessMapOptionsToQueryString(parameters);

        return this.request<TrRoutingApi.TrRoutingV2.AccessibilityMapResponse>(
            trRoutingQuery,
            hostPort.host,
            hostPort.port,
            'v2/accessibility'
        );
    }

    updateCache(parameters: { cacheNames: string[]; customPath?: string }, host?: string, port?: string) {
        const cacheNames = parameters.cacheNames || ['all'];
        const customPath = parameters.customPath || null;

        const trRoutingQuery = `cache_names=${cacheNames.join(',')}${
            customPath ? `&custom_cache_path=${customPath}` : ''
        }`;

        return this.request(trRoutingQuery, host, port, 'updateCache');
    }

    private getUrlPrefix(
        host: string | undefined,
        port: string | number | undefined,
        customRequestPath: string
    ): string {
        // FIXME We should not get the port from here, as we assume here it is for the single instance and not the batch.
        const trRoutingConfig = ServerConfig.getTrRoutingConfig('single');
        if (host === undefined) {
            // There used to be a host in the config, but we do not support it, it either comes from the environment or is localhost
            host = process.env.TR_ROUTING_HOST_URL || 'http://localhost';
        }
        if (port === undefined) {
            port = process.env.TR_ROUTING_HOST_PORT || trRoutingConfig.port;
        }
        return `${host}${port ? ':' + port : ''}/${customRequestPath}`;
    }
}

// singleton:
const instance = new TrRoutingServiceBackend();
Object.freeze(instance);

export default instance;
