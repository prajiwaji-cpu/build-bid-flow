// Field Discovery Helper - Add this to your dataMapping.ts or create as a separate utility

export class FieldDiscoveryHelper {
  
  // Analyze all available fields across multiple tasks to help with mapping
  static analyzeAllFieldsAcrossTasks(tasks: HiSAFETask[]): {
    fieldInventory: Record<string, any[]>;
    fieldFrequency: Record<string, number>;
    sampleValues: Record<string, any>;
    suggestedMappings: Record<string, string[]>;
  } {
    console.group('🔬 FIELD DISCOVERY ANALYSIS');
    
    const fieldInventory: Record<string, any[]> = {};
    const fieldFrequency: Record<string, number> = {};
    const sampleValues: Record<string, any> = {};
    
    // Analyze each task
    tasks.forEach((task, taskIndex) => {
      const allTaskData = DataMappingService.extractAllFieldData(task);
      
      Object.entries(allTaskData).forEach(([fieldName, value]) => {
        // Track frequency
        fieldFrequency[fieldName] = (fieldFrequency[fieldName] || 0) + 1;
        
        // Collect all values for this field
        if (!fieldInventory[fieldName]) {
          fieldInventory[fieldName] = [];
        }
        fieldInventory[fieldName].push(value);
        
        // Store a sample value (first non-empty one)
        if (!sampleValues[fieldName] && value !== null && value !== undefined && value !== '') {
          sampleValues[fieldName] = value;
        }
      });
    });
    
    // Generate suggested mappings based on field names and content
    const suggestedMappings = this.generateSuggestedMappings(fieldInventory, sampleValues);
    
    console.log('📊 Field Frequency (how often each field appears):', fieldFrequency);
    console.log('🔍 Sample Values:', sampleValues);
    console.log('💡 Suggested Mappings:', suggestedMappings);
    
    console.groupEnd();
    
    return {
      fieldInventory,
      fieldFrequency,
      sampleValues,
      suggestedMappings
    };
  }
  
  // Generate field mapping suggestions based on field names and content
  private static generateSuggestedMappings(
    fieldInventory: Record<string, any[]>, 
    sampleValues: Record<string, any>
  ): Record<string, string[]> {
    const suggestions: Record<string, string[]> = {
      clientName: [],
      clientEmail: [],
      clientPhone: [],
      projectType: [],
      projectDescription: [],
      estimatedCost: [],
      location: [],
      priority: [],
      equipment: [],
      timeline: []
    };
    
    Object.entries(sampleValues).forEach(([fieldName, sampleValue]) => {
      const lowerFieldName = fieldName.toLowerCase();
      const sampleStr = String(sampleValue).toLowerCase();
      
      // Client name suggestions
      if (lowerFieldName.includes('name') || 
          lowerFieldName.includes('customer') || 
          lowerFieldName.includes('client') ||
          lowerFieldName.includes('contact')) {
        suggestions.clientName.push(fieldName);
      }
      
      // Email suggestions
      if (lowerFieldName.includes('email') || 
          lowerFieldName.includes('e-mail') ||
          sampleStr.includes('@')) {
        suggestions.clientEmail.push(fieldName);
      }
      
      // Phone suggestions
      if (lowerFieldName.includes('phone') || 
          lowerFieldName.includes('mobile') ||
          lowerFieldName.includes('cell') ||
          /\d{3}[\-\.\s]?\d{3}[\-\.\s]?\d{4}/.test(sampleStr)) {
        suggestions.clientPhone.push(fieldName);
      }
      
      // Project type suggestions
      if (lowerFieldName.includes('type') || 
          lowerFieldName.includes('category') ||
          lowerFieldName.includes('service') ||
          lowerFieldName.includes('form')) {
        suggestions.projectType.push(fieldName);
      }
      
      // Description suggestions
      if (lowerFieldName.includes('description') || 
          lowerFieldName.includes('details') ||
          lowerFieldName.includes('summary') ||
          lowerFieldName.includes('brief')) {
        suggestions.projectDescription.push(fieldName);
      }
      
      // Cost suggestions
      if (lowerFieldName.includes('cost') || 
          lowerFieldName.includes('price') ||
          lowerFieldName.includes('total') ||
          lowerFieldName.includes('amount') ||
          lowerFieldName.includes('quote') ||
          lowerFieldName.includes('budget') ||
          (typeof sampleValue === 'number' && sampleValue > 0)) {
        suggestions.estimatedCost.push(fieldName);
      }
      
      // Location suggestions
      if (lowerFieldName.includes('location') || 
          lowerFieldName.includes('address') ||
          lowerFieldName.includes('site') ||
          lowerFieldName.includes('city') ||
          lowerFieldName.includes('state')) {
        suggestions.location.push(fieldName);
      }
      
      // Priority suggestions
      if (lowerFieldName.includes('priority') || 
          lowerFieldName.includes('urgent') ||
          lowerFieldName.includes('rush') ||
          lowerFieldName.includes('emergency')) {
        suggestions.priority.push(fieldName);
      }
      
      // Equipment suggestions
      if (lowerFieldName.includes('equipment') || 
          lowerFieldName.includes('model') ||
          lowerFieldName.includes('serial') ||
          lowerFieldName.includes('part') ||
          lowerFieldName.includes('asset')) {
        suggestions.equipment.push(fieldName);
      }
      
      // Timeline suggestions
      if (lowerFieldName.includes('date') || 
          lowerFieldName.includes('due') ||
          lowerFieldName.includes('deadline') ||
          lowerFieldName.includes('timeline')) {
        suggestions.timeline.push(fieldName);
      }
    });
    
    return suggestions;
  }
  
  // Create a detailed field report for a specific task
  static createDetailedFieldReport(task: HiSAFETask): void {
    console.group(`📋 DETAILED FIELD REPORT - Task ${task.task_id}`);
    
    const allData = DataMappingService.extractAllFieldData(task);
    
    // Root level data
    console.group('🌳 Root Level Properties');
    console.log('Task ID:', allData.task_id);
    console.log('Job ID:', allData.job_id);
    console.log('Status (root):', allData.status_root);
    console.log('Owner (root):', allData.owner_root);
    console.log('Assignee (root):', allData.assignee_root);
    console.log('Created:', allData.created_date);
    console.log('Updated:', allData.updated_date);
    console.log('Due Date:', allData.due_date);
    console.log('Brief Description:', allData.brief_description);
    console.groupEnd();
    
    // Fields data
    console.group('📂 Fields Object Properties');
    Object.entries(allData)
      .filter(([key]) => key.startsWith('field_'))
      .forEach(([key, value]) => {
        const fieldName = key.replace('field_', '');
        const valueType = typeof value;
        const isObject = valueType === 'object' && value !== null;
        
        if (isObject) {
          console.group(`${fieldName} (${valueType})`);
          if (Array.isArray(value)) {
            console.log(`Array with ${value.length} items:`, value);
          } else {
            console.log('Object properties:', Object.keys(value));
            console.log('Full object:', value);
          }
          console.groupEnd();
        } else {
          const preview = valueType === 'string' && value && value.length > 100 
            ? `${value.substring(0, 100)}...` 
            : value;
          console.log(`${fieldName} (${valueType}):`, preview);
        }
      });
    console.groupEnd();
    
    console.groupEnd();
  }
  
  // Export field data to help with manual mapping creation
  static exportFieldDataForMapping(tasks: HiSAFETask[], maxTasks: number = 10): string {
    console.log('📤 Exporting field data for mapping analysis...');
    
    const exportData = tasks.slice(0, maxTasks).map((task, index) => {
      const allData = DataMappingService.extractAllFieldData(task);
      
      return {
        taskNumber: index + 1,
        taskId: task.task_id,
        allAvailableData: allData,
        fieldNames: Object.keys(allData),
        fieldsWithValues: Object.entries(allData)
          .filter(([_, value]) => value !== null && value !== undefined && value !== '')
          .map(([key, value]) => ({
            fieldName: key,
            valueType: typeof value,
            sampleValue: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
          }))
      };
    });
    
    const jsonExport = JSON.stringify(exportData, null, 2);
    console.log('📋 Field data export (copy this to analyze):', jsonExport);
    
    return jsonExport;
  }
}

// Usage Examples:

// 1. Quick analysis of all fields across tasks
export async function discoverAllAvailableFields() {
  console.log('🔍 Starting field discovery...');
  
  try {
    const tasks = await hisafeApi.getAllTasks();
    
    if (tasks.length === 0) {
      console.warn('No tasks found for field discovery');
      return;
    }
    
    console.log(`📊 Analyzing ${tasks.length} tasks for field discovery...`);
    
    // Run comprehensive analysis
    const analysis = FieldDiscoveryHelper.analyzeAllFieldsAcrossTasks(tasks);
    
    // Create detailed reports for first few tasks
    console.log('📋 Creating detailed reports for sample tasks...');
    tasks.slice(0, 3).forEach(task => {
      FieldDiscoveryHelper.createDetailedFieldReport(task);
    });
    
    // Export data for manual review
    const exportData = FieldDiscoveryHelper.exportFieldDataForMapping(tasks, 5);
    
    return {
      analysis,
      exportData,
      totalTasks: tasks.length
    };
    
  } catch (error) {
    console.error('❌ Field discovery failed:', error);
    throw error;
  }
}

// 2. Quick field check for a specific task
export async function inspectSpecificTask(taskId: number) {
  try {
    const task = await hisafeApi.getTask(taskId);
    const allData = DataMappingService.extractAllFieldData(task);
    
    console.log(`🔍 All available data for task ${taskId}:`, allData);
    FieldDiscoveryHelper.createDetailedFieldReport(task);
    
    return allData;
  } catch (error) {
    console.error(`❌ Failed to inspect task ${taskId}:`, error);
    throw error;
  }
}
