/** ParkingLayout — pure route shell. The inner dashboard renders its own header and tabs. */
import React from 'react';
import { Outlet } from 'react-router-dom';

const ParkingLayout: React.FC = () => (
    <Outlet />
);

export default ParkingLayout;
