/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { feature as turfFeature } from '@turf/turf';

import { BaseOdTrip } from 'transition-common/lib/services/odTrip/BaseOdTrip';
import { OdTripRouteResult } from './types';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { Routing } from 'chaire-lib-backend/lib/services/routing/Routing';
import {
    TransitRoutingQueryAttributes,
    RoutingResultsByMode,
    TripRoutingQueryAttributes
} from 'chaire-lib-common/lib/services/routing/types';
import { TrRoutingRouteResult } from 'chaire-lib-common/lib/services/transitRouting/types';

interface RouteOdTripParameters {
    routing: TransitRoutingQueryAttributes;
    trRoutingPort?: number;
    reverseOD: boolean;
    // The result or error of the transit mode, already calculated with the attributes of getOdTripQueryAttributes
    transitResult?: TrRoutingRouteResult | TrError;
}

/**
 * Get the routing attributes of an od trip
 *
 * @param odTrip The od trip to route
 * @param parameters The routing parameters
 * @returns The routing attributes of the od trip, or undefined if it has no
 * origin or destination
 */
export const getOdTripQueryAttributes = (
    odTrip: BaseOdTrip,
    parameters: RouteOdTripParameters
): TripRoutingQueryAttributes | undefined => {
    const routingAttributes = Object.assign({}, parameters.routing);
    // TODO Manage routing port in a better way
    (routingAttributes as any).routingPort = parameters.trRoutingPort;

    const origin = parameters.reverseOD ? odTrip.attributes.destination_geography : odTrip.attributes.origin_geography;
    const destination = parameters.reverseOD
        ? odTrip.attributes.origin_geography
        : odTrip.attributes.destination_geography;

    if (!origin || !origin.coordinates || !destination || !destination.coordinates) {
        return undefined;
    }

    return {
        ...routingAttributes,
        originGeojson: turfFeature(origin),
        destinationGeojson: turfFeature(destination),
        timeSecondsSinceMidnight: odTrip.attributes.timeOfTrip,
        timeType: odTrip.attributes.timeType
    };
};

const routeOdTrip = async function (odTrip: BaseOdTrip, parameters: RouteOdTripParameters): Promise<OdTripRouteResult> {
    const uuid = odTrip.getId();
    const internalId = odTrip.attributes.internal_id || '';

    const tripQueryAttributes = getOdTripQueryAttributes(odTrip, parameters);
    if (tripQueryAttributes === undefined) {
        return {
            uuid,
            internalId
        };
    }
    const origin = tripQueryAttributes.originGeojson.geometry;
    const destination = tripQueryAttributes.destinationGeojson.geometry;

    try {
        const results: RoutingResultsByMode = await Routing.calculate(tripQueryAttributes, {
            transitResult: parameters.transitResult
        });

        // We do not need the walkOnlyPath in the results, as it is already present in the other modes
        if (results.transit) {
            delete results.transit.walkOnlyPath;
        }

        return {
            uuid,
            internalId,
            origin,
            destination,
            results
        };
    } catch (error) {
        return {
            uuid,
            internalId,
            origin,
            destination,
            error: TrError.isTrError(error) ? error.export() : String(error)
        };
    }
};

export default routeOdTrip;
