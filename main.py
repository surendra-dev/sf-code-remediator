#!/usr/bin/env python3
"""
Salesforce Apex Static Analysis and Remediation Tool

Main entry point for command-line usage.
"""

import argparse
import sys
from apex_analyzer import ApexAnalyzer
from apex_fixer import ApexFixer
from report_generator import ReportGenerator

def main():
    """Main execution function."""
    parser = argparse.ArgumentParser(
        description='Salesforce Apex Static Analysis and Remediation Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  # Scan only (no fixes)
  python main.py --directory ./apex_code --no-fix
  
  # Scan and auto-fix
  python main.py --directory ./apex_code --autofix
  
  # Custom report output
  python main.py --directory ./apex_code --autofix --output custom_report.html
        '''
    )
    
    parser.add_argument(
        '--directory',
        '-d',
        required=True,
        help='Directory containing Apex .cls files to analyze'
    )
    
    parser.add_argument(
        '--autofix',
        action='store_true',
        help='Enable automatic fixing of safe violations (default: False)'
    )
    
    parser.add_argument(
        '--no-fix',
        action='store_true',
        help='Disable automatic fixing (detection only)'
    )
    
    parser.add_argument(
        '--output',
        '-o',
        default='apex_analysis_report.html',
        help='Output HTML report filename (default: apex_analysis_report.html)'
    )
    
    args = parser.parse_args()
    
    # Determine fix mode
    auto_fix_enabled = args.autofix and not args.no_fix
    
    print("="*70)
    print("Salesforce Apex Static Analysis & Remediation Tool")
    print("="*70)
    print(f"Directory: {args.directory}")
    print(f"Auto-Fix: {'Enabled' if auto_fix_enabled else 'Disabled'}")
    print(f"Report Output: {args.output}")
    print("="*70)
    
    # Step 1: Detection
    print("\nSTEP 1: DETECTION")
    analyzer = ApexAnalyzer(args.directory)
    analyzer.scan_directory()
    
    # Step 2: Auto-Fix (if enabled)
    fixer = None
    if auto_fix_enabled and analyzer.violations:
        print("\nSTEP 2: AUTO-FIX")
        fixer = ApexFixer(analyzer.violations)
        fixer.process_all_fixes()
    
    # Step 3: Generate Report
    print("\nSTEP 3: REPORT GENERATION")
    report_gen = ReportGenerator(analyzer, fixer)
    report_gen.create_report(args.output)
    
    print("\n" + "="*70)
    print(f"Analysis complete! Report saved to: {args.output}")
    print("="*70)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nOperation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
