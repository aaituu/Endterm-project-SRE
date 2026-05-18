import React from 'react';
import { Navigate } from 'react-router-dom';

/** Ескі монолиттік бет орнына жаңа бөлім беттеріне бағыттайды. */
const Academic = () => <Navigate to="/admin/academic/classes" replace />;

export default Academic;
