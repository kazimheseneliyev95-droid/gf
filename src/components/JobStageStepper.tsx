import React from 'react';
import { Check, Circle, Clock, Send } from 'lucide-react';
import { JobPost, JobApplication } from '../types';

interface Props {
  job: JobPost;
  application?: JobApplication;
  currentWorkerUsername: string;
}

export default function JobStageStepper({ job, application, currentWorkerUsername }: Props) {
  // Determine current stage index (0-3)
  let currentStep = 0;
  
  const isAssignedToMe = job.assignedWorkerUsername === currentWorkerUsername;
  const hasApplied = !!application;

  if (job.status === 'completed' && isAssignedToMe) {
    currentStep = 3; // Done
  } else if (job.status === 'processing' && isAssignedToMe) {
    currentStep = 2; // In Progress
  } else if (hasApplied) {
    currentStep = 1; // Applied
  } else {
    currentStep = 0; // Explore/New
  }

  const steps = [
    { label: 'New', icon: Circle },
    { label: 'Applied', icon: Send },
    { label: 'Hired', icon: Clock },
    { label: 'Done', icon: Check }
  ];

  return (
    <div className="w-full mt-4 mb-2">
      <div className="relative flex items-center justify-between w-full">
        {/* Connecting Line */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-100 -z-0 rounded-full"></div>
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-blue-100 -z-0 rounded-full transition-all duration-500"
          style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isActive = index <= currentStep;
          const isCurrent = index === currentStep;
          
          let colorClass = 'bg-gray-100 text-gray-400 border-gray-200';
          if (isCurrent) colorClass = 'bg-blue-600 text-white border-blue-600 shadow-md scale-110';
          else if (isActive) colorClass = 'bg-blue-100 text-blue-600 border-blue-200';

          return (
            <div key={index} className="relative z-10 flex flex-col items-center group">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${colorClass}`}>
                <step.icon size={14} strokeWidth={3} />
              </div>
              <span className={`text-[10px] font-bold mt-1.5 transition-colors ${isCurrent ? 'text-blue-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
