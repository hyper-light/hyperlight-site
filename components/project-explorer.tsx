"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import type { Project } from "@/lib/projects";
import { ProjectCard } from "@/components/project-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const filters = ["All projects", "Available", "In development", "In design"];

export function ProjectExplorer({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState(filters[0]);
  const [query, setQuery] = useState("");
  const visible = projects.filter(
    (project) =>
      (filter === filters[0] || project.status === filter) &&
      `${project.name} ${project.description} ${project.category} ${project.language ?? ""}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <Tabs value={filter} onValueChange={setFilter} className="catalog">
      <div className="catalog-toolbar">
        <TabsList aria-label="Filter projects by stage">
          {filters.map((item) => (
            <TabsTrigger value={item} key={item}>
              {item}
              <span className="tab-count">
                {item === filters[0]
                  ? projects.length
                  : projects.filter((p) => p.status === item).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="search-field">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a project…"
            aria-label="Search projects"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear project search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {visible.length} {visible.length === 1 ? "project" : "projects"} found
      </p>
      {filters.map((item) => (
        <TabsContent value={item} key={item}>
          {visible.length ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={25} />
              <h2>No projects found.</h2>
              <p>Try a different name, language, or stage.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setFilter(filters[0]);
                }}
              >
                Clear filters
              </Button>
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
