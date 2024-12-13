/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import Loadable from 'react-loadable';
import { redirect, useNavigate } from 'react-router-dom';
import Loader from 'react-spinners/HashLoader';

export interface UsersPageProps {
    isAuthenticated: boolean;
    // TODO Type the user
    user: { [key: string]: any };
}

const loader = function Loading() {
    return <Loader size={30} color={'#aaaaaa'} loading={true} />;
};

const UsersComponent = Loadable({
    loader: () => import('../../pageParts/admin/users/UsersComponent'),
    loading: loader
});

class UsersPage extends React.Component<UsersPageProps> {
    constructor(props) {
        const navigate = useNavigate();
        super(props);

        if (this.props.isAuthenticated && this.props.user.is_admin) {
            redirect('/admin/users');
        }
    }

    render() {
        return (
            <div className="admin">
                <UsersComponent />
            </div>
        );
    }
}

export default UsersPage;
