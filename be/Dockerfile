# syntax=docker/dockerfile:1.7

FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV UV_LINK_MODE=copy
ENV UV_PROJECT_ENVIRONMENT=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,id=synapse-backend-uv,target=/root/.cache/uv \
    uv sync

COPY docker/fontconfig/60-synapse-presentation-fonts.conf /etc/fonts/conf.d/

# LibreOffice converts PowerPoint to PDF. Keep the font set broad because missing
# presentation fonts change text metrics and can make text boxes overlap.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        fontconfig \
        libreoffice-impress \
        fonts-cabin \
        fonts-dejavu-core \
        fonts-liberation \
        fonts-noto-core \
    && install -d /usr/local/share/fonts/synapse /usr/local/share/doc/synapse-fonts \
    && curl --fail --location --retry 3 \
        https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf \
        --output /usr/local/share/fonts/synapse/Anton-Regular.ttf \
    && curl --fail --location --retry 3 \
        https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/BeVietnamPro-Bold.ttf \
        --output /usr/local/share/fonts/synapse/BeVietnamPro-Bold.ttf \
    && curl --fail --location --retry 3 \
        https://raw.githubusercontent.com/google/fonts/main/ofl/anton/OFL.txt \
        --output /usr/local/share/doc/synapse-fonts/Anton-OFL.txt \
    && curl --fail --location --retry 3 \
        https://raw.githubusercontent.com/google/fonts/main/ofl/bevietnampro/OFL.txt \
        --output /usr/local/share/doc/synapse-fonts/BeVietnamPro-OFL.txt \
    && fc-cache --force \
    && rm -rf /var/lib/apt/lists/*

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
