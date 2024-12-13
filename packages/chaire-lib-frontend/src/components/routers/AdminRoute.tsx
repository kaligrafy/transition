/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import PrivateRoute, { PrivateRouteProps } from './PrivateRoute';

const AdminRoute = (props: PrivateRouteProps) => <PrivateRoute {...props} permissions={{ all: 'manage' }} />;

export default AdminRoute;
