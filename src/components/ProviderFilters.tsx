import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, X, Filter, Search } from 'lucide-react';

interface ProviderFiltersProps {
  states: string[];
  specialties: string[];
  selectedStates: string[];
  selectedSpecialties: string[];
  onStateChange: (states: string[]) => void;
  onSpecialtyChange: (specialties: string[]) => void;
  onClearAll: () => void;
  totalCount: number;
  filteredCount: number;
  excludeInstitutional: boolean;
  onExcludeInstitutionalChange: (value: boolean) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectFilter({ label, options, selected, onChange }: MultiSelectFilterProps) {
  const [search, setSearch] = useState('');
  
  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => opt.toLowerCase().includes(search.toLowerCase()));
  }, [options, search]);

  const handleToggle = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const handleSelectAll = () => {
    if (selected.length === filteredOptions.length) {
      onChange([]);
    } else {
      onChange([...filteredOptions]);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1">
          {label}
          {selected.length > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {selected.length}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder={`Search ${label.toLowerCase()}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="p-2 border-b">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs"
            onClick={handleSelectAll}
          >
            {selected.length === filteredOptions.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
        <ScrollArea className="h-64">
          <div className="p-2 space-y-1">
            {filteredOptions.map((option) => (
              <div
                key={option}
                className="flex items-center space-x-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                onClick={() => handleToggle(option)}
              >
                <Checkbox
                  checked={selected.includes(option)}
                  onCheckedChange={() => handleToggle(option)}
                />
                <span className="text-sm truncate">{option}</span>
              </div>
            ))}
            {filteredOptions.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No results</p>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function ProviderFilters({
  states,
  specialties,
  selectedStates,
  selectedSpecialties,
  onStateChange,
  onSpecialtyChange,
  onClearAll,
  totalCount,
  filteredCount,
  excludeInstitutional,
  onExcludeInstitutionalChange,
  searchQuery,
  onSearchChange,
}: ProviderFiltersProps) {
  const hasActiveFilters = 
    (searchQuery ?? '').trim() !== '' ||
    selectedStates.length > 0 || 
    selectedSpecialties.length > 0 ||
    !excludeInstitutional;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or NPI..."
            value={searchQuery ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        
        {/* Institutional toggle */}
        <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-muted/30">
          <Switch
            id="exclude-institutional"
            checked={excludeInstitutional}
            onCheckedChange={onExcludeInstitutionalChange}
          />
          <Label htmlFor="exclude-institutional" className="text-sm cursor-pointer">
            Exclude institutional
          </Label>
          <span className="text-xs text-muted-foreground">(labs, pharmacies, ambulance, etc.)</span>
        </div>
        
        <MultiSelectFilter
          label="State"
          options={states}
          selected={selectedStates}
          onChange={onStateChange}
        />
        
        <MultiSelectFilter
          label="Specialty"
          options={specialties}
          selected={selectedSpecialties}
          onChange={onSpecialtyChange}
        />
        
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-9 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
      
      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} verified outliers
      </div>
    </div>
  );
}
