/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React, { PropsWithChildren } from 'react';
import { connect } from 'react-redux';
import { Navigate, RouteProps } from 'react-router-dom';

import { Header } from '../pageParts';
import { CliUser } from 'chaire-lib-common/lib/services/user/userType';

type PrivateRouteProps = RouteProps & {
    isAuthenticated: boolean;
    component: any;
    componentProps: { [prop: string]: unknown };
    user: CliUser;
    permissions?: { [subject: string]: string | string[] };
    config?: { [key: string]: unknown };
} & PropsWithChildren;

const PrivateRoute = ({ permissions, component: Component, children, ...rest }: PrivateRouteProps) => {
    return rest.isAuthenticated ? (
        permissions ? rest.user.isAuthorized(permissions) : true ? (
            <React.Fragment>
                <Header
                    path={rest.path as string}
                    user={rest.user}
                    appName={rest.config?.appName as string}
                />
                <Component {...rest.componentProps} />
            </React.Fragment>
        ) : (
            <Navigate to="/unauthorized" /*replace state={{ referrer: location }} */ />
        )
    ) : (
        <Navigate to="/login" /*replace state={{ referrer: location }} */ />
    );
};

/*const mapStateToProps = (state) => ({
    user: state.auth.user,
    isAuthenticated: !!state.auth.isAuthenticated
});*/

export default /*connect(mapStateToProps)*/PrivateRoute;
