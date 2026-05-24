import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Filter, MapPin, DollarSign, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const DEVICE_TYPES = ['Motorcycle', 'Car', 'Phone', 'Laptop', 'Agro Input', 'Fuel', 'Solar Item', 'Other'];
const FINANCING_OPTIONS = ['Daily Hire', 'Weekly Hire', 'Monthly Hire', 'Hire Purchase'];

export default function DeviceMarketplace() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('all');
    const [priceRange, setPriceRange] = useState([0, 1000000]);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [rentalDialogOpen, setRentalDialogOpen] = useState(false);
    const [rentalData, setRentalData] = useState({
        start_date: '',
        end_date: '',
        financing_type: 'Daily Hire',
    });
    const [requesting, setRequesting] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchDevices();
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
        } catch {
            setUser(null);
        }
    };

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const allDevices = await base44.entities.Device.filter({});
            const availableDevices = allDevices.filter(d => 
                d.status === 'Available' && 
                d.admin_verification_status === 'Approved' &&
                d.is_listed_on_marketplace === true
            );
            setDevices(availableDevices);
        } catch (error) {
            console.error('Error fetching devices:', error);
            toast.error('Failed to load devices');
        }
        setLoading(false);
    };

    const filteredDevices = devices.filter(device => {
        const matchesSearch = (device.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.location_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            device.district?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = selectedType === 'all' || device.device_type === selectedType;
        const matchesPrice = device.daily_rate >= priceRange[0] && device.daily_rate <= priceRange[1];
        return matchesSearch && matchesType && matchesPrice;
    });

    const handleRequestRental = async () => {
        if (!user) {
            toast.error('Please login to request a rental');
            return;
        }
        if (!rentalData.start_date || !rentalData.end_date) {
            toast.error('Please select start and end dates');
            return;
        }

        setRequesting(true);
        try {
            const userProfile = await base44.entities.UserProfile.filter({ user_id: user.id }).then(r => r[0]);
            if (!userProfile) {
                toast.error('Please complete your profile first');
                setRequesting(false);
                return;
            }

            const startDate = new Date(rentalData.start_date);
            const endDate = new Date(rentalData.end_date);
            const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            
            let totalFee = 0;
            if (rentalData.financing_type === 'Daily Hire') {
                totalFee = selectedDevice.daily_rate * days;
            } else if (rentalData.financing_type === 'Weekly Hire') {
                totalFee = (selectedDevice.weekly_rate || selectedDevice.daily_rate * 7) * Math.ceil(days / 7);
            } else if (rentalData.financing_type === 'Monthly Hire') {
                totalFee = (selectedDevice.monthly_rate || selectedDevice.daily_rate * 30) * Math.ceil(days / 30);
            }

            const rentalRef = `RA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
            
            await base44.entities.RentalAgreement.create({
                device_id: selectedDevice.id,
                borrower_id: user.id,
                lender_id: selectedDevice.lender_id,
                rental_ref: rentalRef,
                start_date: rentalData.start_date,
                end_date: rentalData.end_date,
                financing_type: rentalData.financing_type,
                total_rental_fee: totalFee,
                payment_method: 'MTN Mobile Money',
                status: 'Requested',
                delivery_method: 'Pickup',
                description: `Rental request for ${selectedDevice.make} ${selectedDevice.model}`,
            });

            toast.success('Rental request submitted! Lender will review soon.');
            setRentalDialogOpen(false);
            setRentalData({ start_date: '', end_date: '', financing_type: 'Daily Hire' });
        } catch (error) {
            console.error('Error creating rental:', error);
            toast.error('Failed to submit rental request');
        }
        setRequesting(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="bg-[#006B3C] text-white px-4 pt-10 pb-6">
                <h1 className="text-2xl font-bold">Device Marketplace</h1>
                <p className="text-green-100 text-sm mt-1">Rent verified devices from trusted lenders</p>
            </div>

            <div className="px-4 mt-4 space-y-4">
                <Card>
                    <CardContent className="p-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <Input
                                placeholder="Search by make, model, or location..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Select value={selectedType} onValueChange={setSelectedType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Device Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {DEVICE_TYPES.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={String(priceRange[1])} onValueChange={(v) => setPriceRange([0, Number(v)])}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Max Price" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="100000">UGX 100K</SelectItem>
                                    <SelectItem value="500000">UGX 500K</SelectItem>
                                    <SelectItem value="1000000">UGX 1M</SelectItem>
                                    <SelectItem value="2000000">UGX 2M</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-4 border-green-100 border-t-[#006B3C] rounded-full animate-spin"></div>
                    </div>
                ) : filteredDevices.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 text-center text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No devices found matching your criteria</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredDevices.map(device => (
                            <Card key={device.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                                <CardHeader className="p-0">
                                    {device.image_urls?.[0] ? (
                                        <img src={device.image_urls[0]} alt={`${device.make} ${device.model}`} className="w-full h-48 object-cover" />
                                    ) : (
                                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                            <span className="text-gray-400 text-4xl">📷</span>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    <div>
                                        <h3 className="font-bold text-lg">{device.make} {device.model}</h3>
                                        <p className="text-sm text-gray-500">{device.device_type}</p>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin className="w-4 h-4" />
                                        <span className="truncate">{device.district || device.location_address || 'Location not specified'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <DollarSign className="w-4 h-4 text-[#006B3C]" />
                                        <span className="font-semibold text-[#006B3C]">UGX {device.daily_rate?.toLocaleString()}/day</span>
                                    </div>
                                    {device.condition_type && (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-green-600" />
                                            <span className="text-xs text-gray-600">{device.condition_type} condition</span>
                                        </div>
                                    )}
                                    <Dialog open={rentalDialogOpen && selectedDevice?.id === device.id} onOpenChange={(open) => {
                                        setRentalDialogOpen(open);
                                        if (!open) setSelectedDevice(null);
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button 
                                                className="w-full bg-[#006B3C] hover:bg-[#005a32]"
                                                onClick={() => setSelectedDevice(device)}
                                            >
                                                Request Rental
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>Request Rental</DialogTitle>
                                                <DialogDescription>
                                                    {selectedDevice?.make} {selectedDevice?.model}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4 py-4">
                                                <div>
                                                    <Label>Start Date</Label>
                                                    <Input 
                                                        type="date" 
                                                        value={rentalData.start_date}
                                                        onChange={(e) => setRentalData({...rentalData, start_date: e.target.value})}
                                                        min={new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>End Date</Label>
                                                    <Input 
                                                        type="date" 
                                                        value={rentalData.end_date}
                                                        onChange={(e) => setRentalData({...rentalData, end_date: e.target.value})}
                                                        min={rentalData.start_date || new Date().toISOString().split('T')[0]}
                                                    />
                                                </div>
                                                <div>
                                                    <Label>Financing Type</Label>
                                                    <Select 
                                                        value={rentalData.financing_type}
                                                        onValueChange={(v) => setRentalData({...rentalData, financing_type: v})}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {FINANCING_OPTIONS.map(opt => (
                                                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {rentalData.start_date && rentalData.end_date && (
                                                    <div className="bg-gray-50 p-3 rounded-lg">
                                                        <p className="text-sm text-gray-600">
                                                            Estimated Total: <span className="font-bold text-[#006B3C]">
                                                                UGX {(() => {
                                                                    const days = Math.ceil((new Date(rentalData.end_date) - new Date(rentalData.start_date)) / (1000 * 60 * 60 * 24));
                                                                    if (rentalData.financing_type === 'Daily Hire') return (selectedDevice?.daily_rate * days)?.toLocaleString();
                                                                    if (rentalData.financing_type === 'Weekly Hire') return ((selectedDevice?.weekly_rate || selectedDevice?.daily_rate * 7) * Math.ceil(days / 7))?.toLocaleString();
                                                                    if (rentalData.financing_type === 'Monthly Hire') return ((selectedDevice?.monthly_rate || selectedDevice?.daily_rate * 30) * Math.ceil(days / 30))?.toLocaleString();
                                                                    return '0';
                                                                })()}
                                                            </span>
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setRentalDialogOpen(false)}>Cancel</Button>
                                                <Button 
                                                    className="bg-[#006B3C] hover:bg-[#005a32]"
                                                    onClick={handleRequestRental}
                                                    disabled={requesting}
                                                >
                                                    {requesting ? 'Submitting...' : 'Submit Request'}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}