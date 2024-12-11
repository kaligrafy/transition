/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import DashboardTransition from '../dashboard/TransitionDashboard';
import { MainMapProps } from '../map/TransitionMainMap';
import NotFoundPage from 'chaire-lib-frontend/lib/components/pages/NotFoundPage';
import UnauthorizedPage from 'chaire-lib-frontend/lib/components/pages/UnauthorizedPage';
import { LoginPage } from 'chaire-lib-frontend/lib/components/pages';
import RegisterPage from 'chaire-lib-frontend/lib/components/pages/RegisterPage';
import ForgotPage from 'chaire-lib-frontend/lib/components/pages/ForgotPasswordPage';
import VerifyPage from 'chaire-lib-frontend/lib/components/pages/VerifyPage';
import ResetPasswordPage from 'chaire-lib-frontend/lib/components/pages/ResetPasswordPage';
import UnconfirmedPage from 'chaire-lib-frontend/lib/components/pages/UnconfirmedPage';
import PrivateRoute from 'chaire-lib-frontend/lib/components/routers/PrivateRoute';
import PublicRoute from 'chaire-lib-frontend/lib/components/routers/PublicRoute';
import { DashboardContribution } from 'chaire-lib-frontend/lib/services/dashboard/DashboardContribution';

type TransitionRouterProps = {
    contributions: DashboardContribution[];
    mainMap: React.ComponentType<MainMapProps>;
    config: any;
}

const TransitionRouter: React.FunctionComponent<TransitionRouterProps> = (props: TransitionRouterProps) => {
    //const navigate = useNavigate();
    //const location = useLocation();
    const auth = useSelector((state: any) => ({
        isAuthenticated: state.auth.isAuthenticated,
        user: state.auth.user
    }));

    return (
        <React.Fragment>
            <Routes>
                {/*<PrivateRoute
                    path="/"
                    component={DashboardTransition}
                    componentProps={{ contributions: props.contributions, mainMap: props.mainMap }}
                    config={props.config}
                />
                <PublicRoute path="/login" component={LoginPage} config={props.config} />
                <PublicRoute path="/register" component={RegisterPage} config={props.config} />
                <PublicRoute path="/forgot" component={ForgotPage} config={props.config} />
                <PublicRoute path="/unconfirmed" component={UnconfirmedPage} config={props.config} />
                <PublicRoute
                    path="/verify/:token"
                    component={VerifyPage}
                    config={props.config}
                    queryString={location.search}
                />
                <PublicRoute
                    path="/reset/:token"
                    component={ResetPasswordPage}
                    config={props.config}
                    queryString={location.search}
                />
                <PublicRoute path="/unauthorized" component={UnauthorizedPage} />*/
                }
                <Route path="/login" element={
                    <PublicRoute
                        isAuthenticated={auth.isAuthenticated}
                        component={LoginPage}
                        config={props.config}
                    />
                } />
                <Route
                    path="/"
                    element={
                        <PrivateRoute
                            isAuthenticated={auth.isAuthenticated}
                            user={auth.user}
                            component={DashboardTransition}
                            componentProps={{ contributions: props.contributions, mainMap: props.mainMap }}
                            config={props.config}
                        />
                    }
                />
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute
                            isAuthenticated={auth.isAuthenticated}
                            user={auth.user}
                            component={DashboardTransition}
                            componentProps={{ contributions: props.contributions, mainMap: props.mainMap }}
                            config={props.config}
                        />
                    }
                />
                <Route
                    path="/home"
                    element={
                        <PrivateRoute
                            isAuthenticated={auth.isAuthenticated}
                            user={auth.user}
                            component={DashboardTransition}
                            componentProps={{ contributions: props.contributions, mainMap: props.mainMap }}
                            config={props.config}
                        />
                    }
                />
                <Route path="*" element={<NotFoundPage />} />
            </Routes>
        </React.Fragment>
    );
};

export default TransitionRouter;
