/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Layer, LayerProps } from '@deck.gl/core/typed';
import { LayerDescription } from 'chaire-lib-frontend/lib/services/map/layers/LayerDescription';
import { ScatterplotLayer, TripsLayer, PolygonLayer, GeoJsonLayer } from 'deck.gl/typed';

// FIXME default color should probably be a app/user/theme preference?
const DEFAULT_COLOR = '#0086FF';
const defaultRGBA = [
    parseInt(DEFAULT_COLOR.substring(1, 3), 16),
    parseInt(DEFAULT_COLOR.substring(3, 5), 16),
    parseInt(DEFAULT_COLOR.substring(5), 16),
    255
] as [number, number, number, number];

type TransitionMapLayerProps = {
    layerDescription: LayerDescription;
    // TODO Find the right type for this
    viewState;
};

const stringToColor = (hexStringColor: string): [number, number, number] | [number, number, number, number] => [
    parseInt(hexStringColor.substring(1, 3), 16),
    parseInt(hexStringColor.substring(3, 5), 16),
    parseInt(hexStringColor.substring(5, 7), 16),
    hexStringColor.length === 9 ? parseInt(hexStringColor.substring(7, 9), 16) : 255
];

const propertyToColor = (
    feature: GeoJSON.Feature<GeoJSON.Geometry>,
    property: string,
    defaultColor?: string
): [number, number, number] | [number, number, number, number] => {
    if (!feature.properties || !feature.properties[property]) {
        return defaultRGBA;
    }
    const colorValue = feature.properties[property];
    return typeof colorValue === 'string' && colorValue.startsWith('#')
        ? stringToColor(colorValue)
        : Array.isArray(colorValue)
            ? [
                parseInt(colorValue[0]),
                parseInt(colorValue[1]),
                parseInt(colorValue[2]),
                colorValue[3] !== undefined ? parseInt(colorValue[3]) : 255
            ]
            : defaultColor
                ? stringToColor(defaultColor)
                : defaultRGBA;
};

const getLineLayer = (props: TransitionMapLayerProps): TripsLayer =>
    new TripsLayer({
        id: props.layerDescription.id,
        data: props.layerDescription.layerData.features,
        getPath: (d) => d.geometry.coordinates,
        //getTimestamps: d => setTimestamps(d),
        getColor: (d) => propertyToColor(d, 'color'),
        opacity: 0.8,
        widthMinPixels: 2,
        rounded: true,
        fadeTrail: true,
        trailLength: 400,
        currentTime: 0,
        shadowEnabled: false,
        pickable: true
        /*updateTriggers: {
      getWidth: routeIndex
    },
    onHover: (line) => {
      routeIndex = line.index;
    },
    onClick: ({object}) => {
      nodeSelected = null
      routeSelected = [object]
    } */
    });

const getPolygonLayer = (props: TransitionMapLayerProps): GeoJsonLayer =>
    new GeoJsonLayer({
        id: props.layerDescription.id,
        data: props.layerDescription.layerData.features,
        pickable: true,
        stroked: true,
        filled: true,
        wireframe: true,
        lineWidthMinPixels: 1,
        /* getElevation: d => {
        console.log('elevation', d.properties);
        return 0;
    }, */
        getFillColor: (d) => propertyToColor(d, 'color'),
        getLineColor: [80, 80, 80],
        getLineWidth: 1
    });

const getScatterLayer = (props: TransitionMapLayerProps): ScatterplotLayer<any> =>
    new ScatterplotLayer({
        id: props.layerDescription.id,
        data: props.layerDescription.layerData.features,
        filled: true,
        stroked: true,
        getPosition: (d) => d.geometry.coordinates,
        getFillColor: (d) => propertyToColor(d, 'color'),
        getLineColor: [255, 255, 255, 255],
        getRadius: (d, i) => 10,
        /* updateTriggers: {
          getRadius: nodeIndex
        }, */
        pickable: true
        /*onHover: (node) => {
          nodeIndex = node.index;
        },
        onClick: ({object}) => {
          routeSelected = null
          nodeSelected = [object]
        } */
    });

const getLayer = (props: TransitionMapLayerProps): Layer<LayerProps> | undefined => {
    if (props.layerDescription.layerData === undefined) {
        console.log('layer data is undefined', props.layerDescription.id);
        return undefined;
    }
    if (props.layerDescription.layerDescription.type === 'circle') {
        // FIXME Try not to type as any
        return getScatterLayer(props) as any;
    } else if (props.layerDescription.layerDescription.type === 'line') {
        return getLineLayer(props) as any;
    } else if (props.layerDescription.layerDescription.type === 'fill') {
        return getPolygonLayer(props) as any;
    }
    console.log('unknown layer', props.layerDescription.layerDescription);
    return undefined;
};

export default getLayer;