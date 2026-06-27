// src/components/FeeStructureForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

export default function FeeStructureForm({ isOpen, onClose, onSuccess, initialData = null }) {
    const [form, setForm] = useState({
        course_id: '',
        fee_amount: '',
        installment_allowed: false,
        tax_rate_id: '',
        tax_inclusive: true,
    });
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [taxRates, setTaxRates] = useState([]);

    // ✅ Sync initialData into form when it changes
    useEffect(() => {
        if (initialData) {
            setForm({
                course_id: initialData.course_id || '',
                fee_amount: initialData.fee_amount || '',
                installment_allowed: initialData.installment_allowed || false,
                tax_rate_id: initialData.tax_rate_id || '',
                tax_inclusive: initialData.tax_inclusive !== undefined ? initialData.tax_inclusive : true,
            });
        } else {
            setForm({
                course_id: '',
                fee_amount: '',
                installment_allowed: false,
                tax_rate_id: '',
                tax_inclusive: true,
            });
        }
    }, [initialData]);

    useEffect(() => {
        if (isOpen) {
            fetchData();
        }
    }, [isOpen]);

    const fetchData = async () => {
        const [coursesRes, taxRes] = await Promise.all([
            supabase.from('courses').select('id, course_name').eq('status', true),
            supabase.from('tax_rates').select('id, name, rate').eq('is_active', true)
        ]);
        setCourses(coursesRes.data || []);
        setTaxRates(taxRes.data || []);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.course_id || !form.fee_amount) {
            toast.error('Please fill all required fields');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                course_id: form.course_id,
                fee_amount: parseFloat(form.fee_amount),
                installment_allowed: form.installment_allowed,
                tax_rate_id: form.tax_rate_id || null,
                tax_inclusive: form.tax_inclusive,
            };

            let result;
            if (initialData?.id) {
                const { data, error } = await supabase
                    .from('fee_structures')
                    .update(payload)
                    .eq('id', initialData.id)
                    .select()
                    .single();
                if (error) throw error;
                result = data;
                toast.success('Fee structure updated!');
            } else {
                const { data, error } = await supabase
                    .from('fee_structures')
                    .insert([payload])
                    .select()
                    .single();
                if (error) throw error;
                result = data;
                toast.success('Fee structure created!');
            }

            onSuccess?.();
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-secondary-light px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <h2 className="text-xl font-righteous text-primary-dark">
                        {initialData?.id ? 'Edit Fee Structure' : 'New Fee Structure'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-secondary-bg rounded-lg">
                        <X size={20} className="text-secondary-dark" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-montserrat text-secondary-dark mb-1">Course *</label>
                        <select
                            name="course_id"
                            value={form.course_id}
                            onChange={handleChange}
                            className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                            required
                        >
                            <option value="">Select Course</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.course_name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-montserrat text-secondary-dark mb-1">Fee Amount *</label>
                        <input
                            type="number"
                            name="fee_amount"
                            value={form.fee_amount}
                            onChange={handleChange}
                            min="0"
                            step="0.01"
                            className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-montserrat text-secondary-dark mb-1">Tax Rate</label>
                        <select
                            name="tax_rate_id"
                            value={form.tax_rate_id}
                            onChange={handleChange}
                            className="w-full border border-secondary-light rounded p-2.5 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        >
                            <option value="">No Tax</option>
                            {taxRates.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.name} ({t.rate}%)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            name="tax_inclusive"
                            checked={form.tax_inclusive}
                            onChange={handleChange}
                            id="tax_inclusive"
                            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="tax_inclusive" className="text-sm text-gray-700">
                            Tax inclusive (fee amount includes tax)
                        </label>
                    </div>

                    <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-lg font-montserrat transition disabled:opacity-60"
                        >
                            {loading ? 'Saving...' : (initialData?.id ? 'Update' : 'Create')}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full sm:w-auto border border-secondary-light text-secondary-dark hover:bg-secondary-bg px-6 py-2.5 rounded-lg font-montserrat transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}