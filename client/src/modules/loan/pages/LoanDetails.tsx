import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const LoanDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        // Redirect to the neutral 'Record Details' page
        if (id) {
            navigate(`/records/${id}`, { replace: true });
        } else {
            navigate('/records/all', { replace: true });
        }
    }, [navigate, id]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800">Redirecting...</h2>
                <p className="text-slate-500">Moving to Record Details</p>
            </div>
        </div>
    );
};

export default LoanDetails;
