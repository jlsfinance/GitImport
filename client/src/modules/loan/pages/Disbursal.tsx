import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Disbursal: React.FC = () => {
    const navigate = useNavigate();
    useEffect(() => {
        // Redirect to the neutral 'New Entry' page
        navigate('/records/new-entry', { replace: true });
    }, [navigate]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800">Redirecting...</h2>
                <p className="text-slate-500">Moving to Record Keeping Module</p>
            </div>
        </div>
    );
};

export default Disbursal;
