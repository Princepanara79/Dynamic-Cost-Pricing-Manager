import React from 'react';
import PageHeader from '../components/ui/PageHeader';
import { FiTool } from 'react-icons/fi';

const PlaceholderPage = ({ title, description }) => {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={description} />
      
      <div className="text-center py-24 px-4 bg-white rounded-lg shadow border border-gray-200">
        <FiTool className="mx-auto h-16 w-16 text-primary-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Under Construction</h3>
        <p className="text-gray-500">
          The <span className="font-semibold">{title}</span> module is currently being built. Check back soon!
        </p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
