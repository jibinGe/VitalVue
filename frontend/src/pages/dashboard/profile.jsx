import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainBody from '@/components/dashboard/main-body';
import { useAuth } from '@/contexts/AuthContext';
import { patientService } from '@/services/patientService';
import avater from '@/assets/img/user-profile.png';
import { User, Mail, Shield, Building, IdCard, ChevronLeft, Calendar, UserCheck, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await patientService.getUserProfile();
        if (response.success) {
          setProfileData(response.data);
        }
      } catch (error) {
        console.error("Failed to fetch profile details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <MainBody>
        <div className="flex items-center justify-center min-h-[60vh] w-full">
            <div className="relative">
                <div className="size-16 rounded-full border-4 border-solid border-[#4A4A4C] border-t-[#CCA166] animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-8 bg-black/20 rounded-full blur-md"></div>
            </div>
        </div>
      </MainBody>
    );
  }

  const details = [
    {
      label: 'Full Name',
      value: profileData?.full_name || user?.name || 'DR. Andrew',
      icon: <User className="size-5 md:size-6 text-[#cca166]" />,
      colSpan: 1
    },
    {
      label: 'Employee ID',
      value: profileData?.user_id || user?.id || 'STAFF-001',
      icon: <IdCard className="size-5 md:size-6 text-[#cca166]" />,
      colSpan: 1
    },
    {
      label: 'Email Address',
      value: profileData?.email || 'andrew@vitalvue.ai',
      icon: <Mail className="size-5 md:size-6 text-[#cca166]" />,
      colSpan: 1
    },
    {
      label: 'Role',
      value: profileData?.role || user?.role || 'Clinician',
      icon: <Shield className="size-5 md:size-6 text-[#cca166]" />,
      colSpan: 1
    },
    {
      label: 'Organization',
      value: profileData?.organization_name || 'VitalVue Healthcare',
      icon: <Building className="size-5 md:size-6 text-[#cca166]" />,
      colSpan: 1
    },
    {
      label: 'Department',
      value: profileData?.department || 'Intensive Care Unit (ICU)',
      icon: <Stethoscope className="size-5 md:size-6 text-[#cca166]" />,
      colSpan: 1
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  return (
    <MainBody>
      <div className="max-w-[1200px] w-full mx-auto pb-10">
        {/* Top Navigation Bar */}
        <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6 flex items-center justify-between"
        >
            <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-white/60 hover:text-[#cca166] transition-colors duration-300"
            >
            <div className="p-1.5 rounded-full bg-[#2F2F31] group-hover:bg-[#cca166]/10 transition-colors duration-300">
                <ChevronLeft className="size-5" />
            </div>
            <span className="font-medium text-sm md:text-base">Back to Dashboard</span>
            </button>
        </motion.div>

        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col lg:flex-row gap-6 md:gap-8 items-start"
        >
            {/* Left Column: Avatar & Quick Info Card */}
            <motion.div variants={itemVariants} className="w-full lg:w-[380px] shrink-0">
                <div className="bg-[#2F2F31]/80 backdrop-blur-xl rounded-[32px] overflow-hidden border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative group">
                    {/* Decorative Background Elements */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#cca166]/10 to-transparent opacity-50"></div>
                    <div className="absolute top-0 right-0 w-full h-32 bg-[linear-gradient(94.82deg,rgba(178,136,77,0.15)_0%,rgba(204,161,102,0.15)_48.98%,rgba(178,136,77,0.15)_98.92%)]"></div>
                    
                    <div className="relative p-8 flex flex-col items-center z-10 pt-16">
                        {/* Avatar */}
                        <div className="relative mb-6">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#cca166] via-[#e5c48b] to-[#b2884d] rounded-full blur opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse"></div>
                            <div className="relative size-32 md:size-40 rounded-full border-[5px] border-[#222225] overflow-hidden shadow-2xl">
                                <img src={avater} alt="Profile" className="w-full h-full object-cover transform hover:scale-105 transition duration-500" />
                            </div>
                            {/* Online Badge */}
                            <div className="absolute bottom-2 right-2 size-6 bg-[#222225] rounded-full flex items-center justify-center">
                                <div className="size-4 bg-[#2CD155] rounded-full shadow-[0_0_10px_#2CD155]"></div>
                            </div>
                        </div>

                        {/* Name & Title */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-wide font-lufga">
                                {profileData?.full_name || user?.name || 'DR. Andrew'}
                            </h1>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#cca166]/10 border border-[#cca166]/20">
                                <UserCheck className="size-4 text-[#cca166]" />
                                <span className="text-[#cca166] font-medium text-sm">
                                    {profileData?.role || user?.role || 'Senior Clinician'}
                                </span>
                            </div>
                        </div>

                        <div className="w-full space-y-3 mt-2 border-t border-white/5 pt-6">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-white/40 text-sm">Status</span>
                                <div className="flex items-center gap-2">
                                    <span className="size-2 rounded-full bg-[#2CD155] animate-pulse"></span>
                                    <span className="text-white/90 text-sm font-medium">Active Session</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between px-2">
                                <span className="text-white/40 text-sm">Last Synced</span>
                                <span className="text-white/90 text-sm font-medium">Just now</span>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Right Column: Detailed Information & Settings */}
            <motion.div variants={itemVariants} className="flex-1 w-full space-y-6 md:space-y-8">
                {/* Details Grid */}
                <div className="bg-[#2F2F31]/50 backdrop-blur-md rounded-[32px] p-6 text-xl p-8 border border-white/5 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                            <Shield className="size-6 text-white" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-semibold text-white tracking-wide">Professional Profile</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {details.map((detail, index) => (
                            <motion.div 
                                key={index}
                                whileHover={{ y: -2, scale: 1.01 }}
                                className="bg-[#373739]/40 hover:bg-[#373739]/80 rounded-2xl p-5 border border-white/5 hover:border-[#cca166]/30 transition-all duration-300 group flex flex-col justify-center min-h-[100px]"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-[#222225] rounded-xl shadow-inner group-hover:bg-[#cca166]/10 transition-colors duration-300">
                                    {detail.icon}
                                    </div>
                                    <div className="flex-1 mt-0.5">
                                        <h4 className="text-xs md:text-sm text-white/40 uppercase tracking-wider font-semibold mb-1">
                                            {detail.label}
                                        </h4>
                                        <p className="text-base md:text-lg text-white font-medium break-all md:break-normal">
                                            {detail.value}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

      
            </motion.div>
        </motion.div>
      </div>
    </MainBody>
  );
}
