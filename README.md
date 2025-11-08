# freispace MCP Server

A Model Context Protocol (MCP) server that provides comprehensive analytics and insights for the [scheduling software freispace](https://freispace.com). This server enables AI assistants (e.g. Copilot, Gemini) to query data within freispace, such as project statistics and planning related information.

## Overview

The freispace MCP Server connects any LLM with tooling capabilities to [freispace](https://freispace.com) to query analytical data.

Media teams using freispace can leverage the MCP server to make planning data available to the entire company using the company-wide AI (e.g. Copilot), without users having to be on freispace or even know about freispace, as well as help post-production teams make data-driven decisions while scheduling and planning.

Our MCP Server always respects user permissions, ensuring that the LLM will only be able to access data on a per-user level, ensuring data safety.

Example queries might be "Who worked with Person X in the past" or "How many vacation days do I have left?"

## Features

- **Staff Management**: Complete staff directory, collaboration analysis, and holiday tracking
- **Project Analytics**: Project status, team composition, and performance metrics
- **Resource Management**: Suite, resource, and staff availability tracking
- **Holiday Planning**: Holiday quota management and upcoming absence tracking
- **Collaboration Insights**: Team dynamics and working relationship analysis

## Prerequisites

1. [freispace Flagship](https://freispace.com/pricing) account
2. Valid MCP API key for freispace
    - During `beta`, contact your freispace support team to obtain an MCP API key


## Available Tools

### 1. Staff Directory (`staffs_query`)

Retrieves comprehensive information about all staff members in the organization.

**Use Cases**:
- Get overview of all employees
- Understand organizational structure
- Find staff members by role or department
- Generate staff reports

**Example Queries**:
- "List all staff members"
- "Who are the developers in the company?"
- "Show me the organizational structure"

### 2. Staff Collaboration Analysis (`staffs_worked_together_query`)

Analyzes collaboration patterns and working relationships for specific staff members.

**Parameters**:
- `name` (required): Staff member name

**Use Cases**:
- Analyze team dynamics
- Find collaboration patterns
- Understand project participation
- Generate collaboration reports

**Example Queries**:
- "Who has John worked with on projects?"
- "Show collaboration history for Sarah"
- "Analyze team relationships"

### 3. Holiday Management

#### Next Holidays (`staffs_next_holidays_query`)
Shows upcoming holiday information for staff members.

**Parameters**:
- `name` (optional): Staff member name (defaults to user's assigned staff)

**Use Cases**:
- Plan around staff availability
- Check upcoming absences
- Holiday scheduling

**Example Queries**:
- "When is John's next holiday?"
- "Show upcoming holidays"
- "Who's going on holiday soon?"

#### Holiday Quota (`staffs_holidays_left_query`)
Tracks remaining holiday days for staff members.

**Parameters**:
- `name` (optional): Staff member name
- `year` (optional): Year to query (defaults to current year)

**Use Cases**:
- Monitor holiday usage
- Plan holiday requests
- Resource planning

**Example Queries**:
- "How many holiday days does Sarah have left?"
- "Show holiday quota for 2024"
- "Who has the most holiday days remaining?"

### 4. Project Analytics

#### Project Status (`get_project_status`)
Provides comprehensive project performance and booking statistics.

**Parameters**:
- `name` (required): Project name

**Use Cases**:
- Analyze project performance
- Track booking patterns
- Generate project reports
- Monitor project activity

**Example Queries**:
- "Show status for Project Alpha"
- "Analyze booking patterns for the mobile app project"
- "Generate project performance report"

#### Project Team (`get_staffs_worked_on_project`)
Lists all staff members who have worked on a specific project.

**Parameters**:
- `name` (required): Project name

**Use Cases**:
- Identify project team members
- Analyze team composition
- Track project participation
- Generate team reports

**Example Queries**:
- "Who worked on the website redesign?"
- "Show team members for Project Beta"
- "Analyze project team composition"

#### Staff Projects (`get_staff_projects`)
Shows all projects assigned to a specific staff member.

**Parameters**:
- `name` (required): Staff member name

**Use Cases**:
- Understand staff workload
- Analyze project assignments
- Track staff project portfolio
- Resource allocation planning

**Example Queries**:
- "What projects is John working on?"
- "Show Sarah's project assignments"
- "Analyze staff workload distribution"

### 5. Resource Search (`get_entities_by_name`)

Searches for suites, resources, and staff members by name with availability filtering.

**Parameters**:
- `name` (required): Search term
- `available_only` (optional): Show only available entities
- `booked_only` (optional): Show only booked entities

**Use Cases**:
- Find available resources
- Search for specific entities
- Check availability status
- Resource planning

**Example Queries**:
- "Find available meeting rooms"
- "Search for camera equipment"
- "Show booked resources for today"

## Error Handling

The server includes comprehensive error handling for:
- API connectivity issues
- Invalid parameters
- Missing data
- Authentication failures
- Network timeouts

All errors are logged with detailed information for debugging.

## ⚠️ Beta Notice

Our freispace MCP server is currently in beta. All features are free during this period. We appreciate your feedback and patience as we continue to improve the platform.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

For support and questions:
- **Documentation**: [freispace documentation](https://docs.freispace.com)
- **Issues**: [GitHub Issues](https://github.com/freispace/mcp-server-analytics/issues)
- **Contact**: [freispace Support](https://freispace.com/support)